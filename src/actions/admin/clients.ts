"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { clientFormSchema, type ClientFormValues } from "@/lib/validations";
import type { ActionResult } from "@/types";
import type { Client, ServiceType } from "@prisma/client";
import type { ClientWithServices } from "@/types";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { runSiteCheck } from "@/lib/site-checks";

export async function getClients(includeArchived = false): Promise<ActionResult<ClientWithServices[]>> {
  try {
    await requireStaff();
    const clients = await prisma.client.findMany({
      where: includeArchived ? {} : { isActive: true },
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
    await requireStaff();
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
    const user = await requireStaff();
    const parsed = clientFormSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const data = parsed.data;
    const client = await prisma.client.create({
      data: {
        name: data.name,
        websiteUrl: data.websiteUrl || null,
        stripeCustomerId: user.isAdmin ? (data.stripeCustomerId || null) : undefined,
        umamiSiteId: data.umamiSiteId || null,
        umamiShareId: data.umamiShareId || null,
        uptimeKumaMonitorId: data.uptimeKumaMonitorId || null,
        searchConsoleUrl: data.searchConsoleUrl || null,
        notes: data.notes || null,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/clients");

    // Run site check after response is sent (keeps serverless function alive)
    if (client.websiteUrl) {
      const url = client.websiteUrl;
      const id = client.id;
      after(async () => {
        try {
          const status = await runSiteCheck(id, url);
          console.log(`Site check for new client ${id}: ${status}`);
          revalidatePath(`/admin/clients/${id}`);
          revalidatePath("/dashboard");
        } catch (err) {
          console.error(`Site check failed for new client ${id}:`, err);
        }
      });
    }

    return { success: true, data: client };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create client" };
  }
}

export async function updateClient(id: string, values: ClientFormValues): Promise<ActionResult<Client>> {
  try {
    const user = await requireStaff();
    const parsed = clientFormSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const data = parsed.data;
    const client = await prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        websiteUrl: data.websiteUrl || null,
        ...(user.isAdmin && { stripeCustomerId: data.stripeCustomerId || null }),
        umamiSiteId: data.umamiSiteId || null,
        umamiShareId: data.umamiShareId || null,
        uptimeKumaMonitorId: data.uptimeKumaMonitorId || null,
        searchConsoleUrl: data.searchConsoleUrl || null,
        notes: data.notes || null,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/clients");
    revalidatePath(`/admin/clients/${id}`);

    // Run site check after response is sent (keeps serverless function alive)
    if (client.websiteUrl) {
      const url = client.websiteUrl;
      after(async () => {
        try {
          const status = await runSiteCheck(id, url);
          console.log(`Site check for client ${id}: ${status}`);
          revalidatePath(`/admin/clients/${id}`);
          revalidatePath("/dashboard");
        } catch (err) {
          console.error(`Site check failed for client ${id}:`, err);
        }
      });
    }

    return { success: true, data: client };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update client" };
  }
}

export async function archiveClient(id: string): Promise<ActionResult<null>> {
  try {
    await requireStaff();
    await prisma.client.update({
      where: { id },
      data: { isActive: false },
    });
    revalidatePath("/admin/clients");
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to archive client" };
  }
}

export async function restoreClient(id: string): Promise<ActionResult<null>> {
  try {
    await requireStaff();
    await prisma.client.update({
      where: { id },
      data: { isActive: true },
    });
    revalidatePath("/admin/clients");
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to restore client" };
  }
}

export async function deleteClient(id: string): Promise<ActionResult<null>> {
  try {
    await requireStaff();
    await prisma.client.delete({
      where: { id },
    });
    revalidatePath("/admin/clients");
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete client" };
  }
}

export async function triggerSiteCheck(clientId: string): Promise<ActionResult<null>> {
  try {
    await requireStaff();
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, websiteUrl: true },
    });
    if (!client) return { success: false, error: "Client not found" };
    if (!client.websiteUrl) return { success: false, error: "No website URL configured" };

    const status = await runSiteCheck(client.id, client.websiteUrl);
    if (status !== "ok") return { success: false, error: `Site check failed: ${status}` };

    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath("/dashboard");
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to run site check" };
  }
}

export async function updateClientServices(
  clientId: string,
  serviceTypes: ServiceType[]
): Promise<ActionResult<null>> {
  try {
    await requireStaff();

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
