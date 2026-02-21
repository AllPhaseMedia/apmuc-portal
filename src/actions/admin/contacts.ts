"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { ClientContact } from "@prisma/client";
import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";

const contactSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  roleLabel: z.string().optional(),
  canDashboard: z.boolean().default(true),
  canBilling: z.boolean().default(true),
  canAnalytics: z.boolean().default(true),
  canUptime: z.boolean().default(true),
  canSupport: z.boolean().default(true),
  canSiteHealth: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export type ContactFormValues = z.infer<typeof contactSchema>;

export async function getClientContacts(
  clientId: string
): Promise<ActionResult<ClientContact[]>> {
  try {
    await requireAdmin();
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
  values: ContactFormValues
): Promise<ActionResult<ClientContact>> {
  try {
    await requireAdmin();
    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const data = parsed.data;

    // Attempt to find existing Clerk user by email to auto-link
    let clerkUserId: string | null = null;
    try {
      const clerk = await clerkClient();
      const users = await clerk.users.getUserList({
        emailAddress: [data.email],
      });
      if (users.data.length > 0) {
        clerkUserId = users.data[0].id;
      }
    } catch {
      // Clerk lookup failed — continue without linking
    }

    const contact = await prisma.clientContact.create({
      data: {
        clientId,
        email: data.email,
        name: data.name,
        roleLabel: data.roleLabel || null,
        clerkUserId,
        canDashboard: data.canDashboard,
        canBilling: data.canBilling,
        canAnalytics: data.canAnalytics,
        canUptime: data.canUptime,
        canSupport: data.canSupport,
        canSiteHealth: data.canSiteHealth,
        isActive: data.isActive,
      },
    });

    revalidatePath(`/admin/clients/${clientId}`);
    return { success: true, data: contact };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { success: false, error: "A contact with this email already exists for this client" };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add contact",
    };
  }
}

export async function updateClientContact(
  contactId: string,
  values: Partial<ContactFormValues>
): Promise<ActionResult<ClientContact>> {
  try {
    await requireAdmin();

    const contact = await prisma.clientContact.update({
      where: { id: contactId },
      data: {
        ...(values.name !== undefined && { name: values.name }),
        ...(values.email !== undefined && { email: values.email }),
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
    await requireAdmin();

    const contact = await prisma.clientContact.delete({
      where: { id: contactId },
    });

    revalidatePath(`/admin/clients/${contact.clientId}`);
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove contact",
    };
  }
}
