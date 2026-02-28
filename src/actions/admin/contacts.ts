"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { ClientContact } from "@prisma/client";
import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { listClerkUsers, type ClerkUserInfo } from "@/actions/admin/impersonate";

const addContactSchema = z.object({
  clerkUserId: z.string().min(1, "User is required"),
  roleLabel: z.string().optional(),
  canDashboard: z.boolean().default(true),
  canBilling: z.boolean().default(true),
  canAnalytics: z.boolean().default(true),
  canUptime: z.boolean().default(true),
  canSupport: z.boolean().default(true),
  canSiteHealth: z.boolean().default(true),
});

export type AddContactValues = z.infer<typeof addContactSchema>;

const updateContactSchema = z.object({
  roleLabel: z.string().optional(),
  canDashboard: z.boolean().optional(),
  canBilling: z.boolean().optional(),
  canAnalytics: z.boolean().optional(),
  canUptime: z.boolean().optional(),
  canSupport: z.boolean().optional(),
  canSiteHealth: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateContactValues = z.infer<typeof updateContactSchema>;

export async function getClientContacts(
  clientId: string
): Promise<ActionResult<ClientContact[]>> {
  try {
    await requireStaff();
    const contacts = await prisma.clientContact.findMany({
      where: { clientId },
      orderBy: { createdAt: "asc" },
    });
    return { success: true, data: contacts };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch contacts",
    };
  }
}

export async function addClientContact(
  clientId: string,
  values: AddContactValues
): Promise<ActionResult<ClientContact>> {
  try {
    await requireStaff();
    const parsed = addContactSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const data = parsed.data;

    // Look up Clerk user for email/name
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(data.clerkUserId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const name = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || email;

    const contact = await prisma.clientContact.create({
      data: {
        clientId,
        clerkUserId: data.clerkUserId,
        email,
        name,
        roleLabel: data.roleLabel || null,
        canDashboard: data.canDashboard,
        canBilling: data.canBilling,
        canAnalytics: data.canAnalytics,
        canUptime: data.canUptime,
        canSupport: data.canSupport,
        canSiteHealth: data.canSiteHealth,
      },
    });

    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath("/admin/users");
    return { success: true, data: contact };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { success: false, error: "This user is already linked to this client" };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add contact",
    };
  }
}

export async function updateClientContact(
  contactId: string,
  values: UpdateContactValues
): Promise<ActionResult<ClientContact>> {
  try {
    await requireStaff();

    const existing = await prisma.clientContact.findUnique({
      where: { id: contactId },
    });
    if (!existing) {
      return { success: false, error: "Contact not found" };
    }

    const contact = await prisma.clientContact.update({
      where: { id: contactId },
      data: {
        ...(values.roleLabel !== undefined && { roleLabel: values.roleLabel || null }),
        ...(values.canDashboard !== undefined && { canDashboard: values.canDashboard }),
        ...(values.canBilling !== undefined && { canBilling: values.canBilling }),
        ...(values.canAnalytics !== undefined && { canAnalytics: values.canAnalytics }),
        ...(values.canUptime !== undefined && { canUptime: values.canUptime }),
        ...(values.canSupport !== undefined && { canSupport: values.canSupport }),
        ...(values.canSiteHealth !== undefined && { canSiteHealth: values.canSiteHealth }),
        ...(values.isActive !== undefined && { isActive: values.isActive }),
      },
    });

    revalidatePath(`/admin/clients/${contact.clientId}`);
    revalidatePath("/admin/users");
    return { success: true, data: contact };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update contact",
    };
  }
}

export async function removeClientContact(
  contactId: string
): Promise<ActionResult<null>> {
  try {
    await requireStaff();

    const contact = await prisma.clientContact.delete({
      where: { id: contactId },
    });

    revalidatePath(`/admin/clients/${contact.clientId}`);
    revalidatePath("/admin/users");
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove contact",
    };
  }
}

export async function listAllClients(): Promise<ActionResult<{ id: string; name: string }[]>> {
  try {
    await requireStaff();
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: clients };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list clients",
    };
  }
}

export async function listAvailableUsers(
  clientId: string
): Promise<ActionResult<ClerkUserInfo[]>> {
  try {
    await requireStaff();

    // Get all Clerk users
    const allUsers = await listClerkUsers();

    // Get already-linked users for this client
    const linkedContacts = await prisma.clientContact.findMany({
      where: { clientId },
      select: { clerkUserId: true },
    });
    const linkedIds = new Set(linkedContacts.map((c) => c.clerkUserId));

    // Filter out already-linked users
    const available = allUsers.filter((u) => !linkedIds.has(u.id));

    return { success: true, data: available };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list users",
    };
  }
}
