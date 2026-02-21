"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { clientFormSchema, type ClientFormValues } from "@/lib/validations";
import type { ActionResult } from "@/types";
import type { Client, ServiceType } from "@prisma/client";
import type { ClientWithServices } from "@/types";
import { revalidatePath } from "next/cache";

export async function getClients(): Promise<ActionResult<ClientWithServices[]>> {
  try {
    await requireAdmin();
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: { services: true },
    });
    return { success: true, data: clients };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch clients" };
  }
}

export async function getClient(id: string) {
  try {
    await requireAdmin();
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        services: true,
        siteChecks: { orderBy: { checkedAt: "desc" }, take: 1 },
        contacts: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!client) return { success: false as const, error: "Client not found" };
    return { success: true as const, data: client };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to fetch client" };
  }
}

export async function createClient(values: ClientFormValues): Promise<ActionResult<Client>> {
  try {
    await requireAdmin();
    const parsed = clientFormSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const data = parsed.data;
    const client = await prisma.client.create({
      data: {
        email: data.email,
        name: data.name,
        company: data.company || null,
        websiteUrl: data.websiteUrl || null,
        stripeCustomerId: data.stripeCustomerId || null,
        umamiSiteId: data.umamiSiteId || null,
        uptimeKumaMonitorId: data.uptimeKumaMonitorId || null,
        gaPropertyId: data.gaPropertyId || null,
        searchConsoleUrl: data.searchConsoleUrl || null,
        notes: data.notes || null,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/clients");
    return { success: true, data: client };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { success: false, error: "A client with this email already exists" };
    }
    return { success: false, error: error instanceof Error ? error.message : "Failed to create client" };
  }
}

export async function updateClient(id: string, values: ClientFormValues): Promise<ActionResult<Client>> {
  try {
    await requireAdmin();
    const parsed = clientFormSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const data = parsed.data;
    const client = await prisma.client.update({
      where: { id },
      data: {
        email: data.email,
        name: data.name,
        company: data.company || null,
        websiteUrl: data.websiteUrl || null,
        stripeCustomerId: data.stripeCustomerId || null,
        umamiSiteId: data.umamiSiteId || null,
        uptimeKumaMonitorId: data.uptimeKumaMonitorId || null,
        gaPropertyId: data.gaPropertyId || null,
        searchConsoleUrl: data.searchConsoleUrl || null,
        notes: data.notes || null,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/clients");
    revalidatePath(`/admin/clients/${id}`);
    return { success: true, data: client };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update client" };
  }
}

export async function deleteClient(id: string): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
    await prisma.client.update({
      where: { id },
      data: { isActive: false },
    });
    revalidatePath("/admin/clients");
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to deactivate client" };
  }
}

export async function updateClientServices(
  clientId: string,
  serviceTypes: ServiceType[]
): Promise<ActionResult<null>> {
  try {
    await requireAdmin();

    // Remove services not in the new list
    await prisma.clientService.deleteMany({
      where: {
        clientId,
        type: { notIn: serviceTypes },
      },
    });

    // Add new services
    for (const type of serviceTypes) {
      await prisma.clientService.upsert({
        where: { clientId_type: { clientId, type } },
        update: {},
        create: { clientId, type },
      });
    }

    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath("/admin/clients");
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update services" };
  }
}
