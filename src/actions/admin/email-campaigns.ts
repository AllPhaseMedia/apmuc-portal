"use server";

import { requireStaff, getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { wrapEmailTemplate } from "@/lib/email-template";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import type { ServiceType } from "@prisma/client";
import type { ActionResult } from "@/types";

// ============================================================
// Types
// ============================================================

export type AudienceFilters = {
  tags: string[];
  serviceTypes: string[]; // ServiceType enum values
  integrations: {
    hasAnalytics: boolean; // client.umamiSiteId not null
    hasUptime: boolean; // client.uptimeKumaMonitorId not null
    hasBilling: boolean; // client.stripeCustomerId not null
  };
  roles: string[]; // "admin", "team_member", "client"
};

export type Recipient = { email: string; name: string; clients?: string[] };

export type CampaignSummary = {
  id: string;
  subject: string;
  body: string;
  sentByName: string;
  sentAt: Date;
  recipientCount: number;
  recipients: { email: string; name: string; status: string }[];
};

// ============================================================
// 1. resolveAudience
// ============================================================

export async function resolveAudience(
  filters: AudienceFilters
): Promise<ActionResult<Recipient[]>> {
  try {
    await requireStaff();

    const hasRoleFilter = filters.roles.length > 0;
    const hasTagFilter = filters.tags.length > 0;
    const hasServiceFilter = filters.serviceTypes.length > 0;
    const hasIntegrationFilter =
      filters.integrations.hasAnalytics ||
      filters.integrations.hasUptime ||
      filters.integrations.hasBilling;

    // If no filters selected, return empty
    if (!hasRoleFilter && !hasTagFilter && !hasServiceFilter && !hasIntegrationFilter) {
      return { success: true, data: [] };
    }

    // Map<email, name> for deduplication
    const recipientMap = new Map<string, string>();

    // --- Clerk-based filters: roles and tags ---
    if (hasRoleFilter || hasTagFilter) {
      const clerk = await clerkClient();
      let offset = 0;

      for (;;) {
        const { data } = await clerk.users.getUserList({
          limit: 100,
          offset,
        });

        for (const user of data) {
          const meta = user.publicMetadata as Record<string, unknown>;
          const rawRole = (meta?.role as string) ?? "client";
          const role = rawRole === "employee" ? "team_member" : rawRole;
          const userTags = Array.isArray(meta?.tags)
            ? (meta.tags as string[])
            : [];

          let matches = false;

          if (hasRoleFilter && filters.roles.includes(role)) {
            matches = true;
          }

          if (
            !matches &&
            hasTagFilter &&
            userTags.some((t) => filters.tags.includes(t))
          ) {
            matches = true;
          }

          if (matches) {
            const email = user.emailAddresses[0]?.emailAddress;
            if (email) {
              const name =
                `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
                email;
              recipientMap.set(email.toLowerCase(), name);
            }
          }
        }

        if (data.length < 100) break;
        offset += 100;
      }
    }

    // --- Prisma-based filters: services and integrations ---
    if (hasServiceFilter || hasIntegrationFilter) {
      const orConditions: Record<string, unknown>[] = [];

      if (hasServiceFilter) {
        orConditions.push({
          services: {
            some: {
              type: { in: filters.serviceTypes as ServiceType[] },
              isActive: true,
            },
          },
        });
      }

      if (filters.integrations.hasAnalytics) {
        orConditions.push({ umamiSiteId: { not: null } });
      }
      if (filters.integrations.hasUptime) {
        orConditions.push({ uptimeKumaMonitorId: { not: null } });
      }
      if (filters.integrations.hasBilling) {
        orConditions.push({ stripeCustomerId: { not: null } });
      }

      const clients = await prisma.client.findMany({
        where: {
          isActive: true,
          OR: orConditions,
        },
        select: { id: true },
      });

      if (clients.length > 0) {
        const clientIds = clients.map((c) => c.id);
        const contacts = await prisma.clientContact.findMany({
          where: {
            clientId: { in: clientIds },
            isActive: true,
          },
          select: { email: true, name: true },
        });

        for (const contact of contacts) {
          if (contact.email) {
            recipientMap.set(contact.email.toLowerCase(), contact.name);
          }
        }
      }
    }

    // Sort by name alphabetically
    const recipients = Array.from(recipientMap.entries())
      .map(([email, name]) => ({ email, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, data: recipients };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to resolve audience",
    };
  }
}

// ============================================================
// 1b. listAllUsers (for manual recipient selection)
// ============================================================

export async function listAllUsers(): Promise<ActionResult<Recipient[]>> {
  try {
    await requireStaff();

    const clerk = await clerkClient();
    const clerkUsers: { id: string; email: string; name: string }[] = [];
    let offset = 0;

    for (;;) {
      const { data } = await clerk.users.getUserList({
        limit: 100,
        orderBy: "-last_sign_in_at",
        offset,
      });

      for (const u of data) {
        const email = u.emailAddresses[0]?.emailAddress;
        if (!email) continue;
        const name =
          `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || email;
        clerkUsers.push({ id: u.id, email: email.toLowerCase(), name });
      }

      if (data.length < 100) break;
      offset += 100;
    }

    // Batch-fetch client links for all users
    const contacts = await prisma.clientContact.findMany({
      where: {
        clerkUserId: { in: clerkUsers.map((u) => u.id) },
        isActive: true,
      },
      select: {
        clerkUserId: true,
        client: { select: { name: true } },
      },
    });

    const clientsByUser = new Map<string, string[]>();
    for (const c of contacts) {
      const list = clientsByUser.get(c.clerkUserId) ?? [];
      list.push(c.client.name);
      clientsByUser.set(c.clerkUserId, list);
    }

    const users: Recipient[] = clerkUsers.map((u) => ({
      email: u.email,
      name: u.name,
      clients: clientsByUser.get(u.id) ?? [],
    }));

    users.sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, data: users };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to list users",
    };
  }
}

// ============================================================
// 2. sendCampaign
// ============================================================

export async function sendCampaign(
  subject: string,
  body: string,
  recipients: Recipient[]
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireStaff();
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Validate inputs
    if (!subject.trim()) return { success: false, error: "Subject is required" };
    if (!body.trim()) return { success: false, error: "Body is required" };
    if (recipients.length === 0)
      return { success: false, error: "At least one recipient is required" };

    // Wrap body in the email template
    const html = wrapEmailTemplate(body, subject);

    // Create campaign record with all recipients as pending
    const campaign = await prisma.emailCampaign.create({
      data: {
        subject,
        body,
        sentByUserId: user.clerkUserId,
        sentByName: user.name,
        recipientCount: recipients.length,
        recipients: {
          create: recipients.map((r) => ({
            email: r.email,
            name: r.name,
            status: "pending",
          })),
        },
      },
      include: { recipients: true },
    });

    // Send emails one by one, updating status
    for (const recipient of campaign.recipients) {
      try {
        await sendEmail({
          to: recipient.email,
          subject,
          html,
        });

        await prisma.emailRecipient.update({
          where: { id: recipient.id },
          data: { status: "sent" },
        });
      } catch {
        await prisma.emailRecipient.update({
          where: { id: recipient.id },
          data: { status: "failed" },
        });
      }

      // Rate limiting: 100ms delay between sends
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    revalidatePath("/admin/email");
    return { success: true, data: { id: campaign.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send campaign",
    };
  }
}

// ============================================================
// 3. listCampaigns
// ============================================================

export async function listCampaigns(): Promise<
  ActionResult<CampaignSummary[]>
> {
  try {
    await requireStaff();

    const campaigns = await prisma.emailCampaign.findMany({
      orderBy: { sentAt: "desc" },
      include: {
        recipients: {
          select: { email: true, name: true, status: true },
        },
      },
    });

    const data: CampaignSummary[] = campaigns.map((c) => ({
      id: c.id,
      subject: c.subject,
      body: c.body,
      sentByName: c.sentByName,
      sentAt: c.sentAt,
      recipientCount: c.recipientCount,
      recipients: c.recipients.map((r) => ({
        email: r.email,
        name: r.name,
        status: r.status,
      })),
    }));

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to list campaigns",
    };
  }
}
