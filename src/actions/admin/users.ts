"use server";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/types";

const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "team_member", "client"]),
});

export type CreateUserValues = z.infer<typeof createUserSchema>;

const updateUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["admin", "team_member", "client"]),
});

export type UpdateUserValues = z.infer<typeof updateUserSchema>;

export async function createUser(
  values: CreateUserValues
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();

    const parsed = createUserSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { firstName, lastName, email, password, role } = parsed.data;

    const clerk = await clerkClient();
    const newUser = await clerk.users.createUser({
      firstName,
      lastName,
      emailAddress: [email],
      password,
    });

    if (role !== "client") {
      await clerk.users.updateUserMetadata(newUser.id, {
        publicMetadata: { role },
      });
    }

    revalidatePath("/admin/users");
    return { success: true, data: { id: newUser.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create user";
    // Clerk errors often have useful messages
    if (
      typeof error === "object" &&
      error !== null &&
      "errors" in error &&
      Array.isArray((error as { errors: { message: string }[] }).errors)
    ) {
      return {
        success: false,
        error: (error as { errors: { message: string }[] }).errors[0].message,
      };
    }
    return { success: false, error: message };
  }
}

export async function updateUser(
  clerkUserId: string,
  values: UpdateUserValues
): Promise<ActionResult<null>> {
  try {
    await requireAdmin();

    const parsed = updateUserSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { firstName, lastName, role } = parsed.data;

    const clerk = await clerkClient();
    await clerk.users.updateUser(clerkUserId, { firstName, lastName });
    await clerk.users.updateUserMetadata(clerkUserId, {
      publicMetadata: { role: role === "client" ? undefined : role },
    });

    revalidatePath("/admin/users");
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update user",
    };
  }
}

export async function deleteUser(
  clerkUserId: string
): Promise<ActionResult<null>> {
  try {
    const currentUser = await requireAdmin();

    if (clerkUserId === currentUser.clerkUserId) {
      return { success: false, error: "You cannot delete your own account" };
    }

    // Clean up portal client contact links
    await prisma.clientContact.deleteMany({
      where: { clerkUserId },
    });

    const clerk = await clerkClient();
    await clerk.users.deleteUser(clerkUserId);

    revalidatePath("/admin/users");
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete user",
    };
  }
}
