"server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import type { Client, ClientService, ClientContact } from "@prisma/client";
import type { ContactPermissions } from "@/types";

const ACTIVE_CLIENT_COOKIE = "apmuc_active_client";

const ALL_TRUE: ContactPermissions = {
  dashboard: true,
  billing: true,
  analytics: true,
  uptime: true,
  support: true,
  siteHealth: true,
};

export type ClientContext = {
  client: Client & { services: ClientService[] };
  accessType: "primary" | "contact";
  contact: ClientContact;
  permissions: ContactPermissions;
  userEmail: string;
};

function permissionsFromContact(contact: ClientContact): ContactPermissions {
  if (contact.isPrimary) return ALL_TRUE;
  return {
    dashboard: contact.canDashboard,
    billing: contact.canBilling,
    analytics: contact.canAnalytics,
    uptime: contact.canUptime,
    support: contact.canSupport,
    siteHealth: contact.canSiteHealth,
  };
}

const clientInclude = { services: true } as const;

/**
 * Resolve which client the current user is viewing and their permissions.
 *
 * Resolution order:
 * 1. Cookie `apmuc_active_client` → validate via ClientContact
 * 2. First active ClientContact for this clerkUserId
 */
export const resolveClientContext = cache(async (): Promise<ClientContext | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const activeClientId = cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value;

  // If cookie is set, validate access via ClientContact
  if (activeClientId) {
    const ctx = await resolveForClient(activeClientId, user.clerkUserId, user.email);
    if (ctx) return ctx;
    // Cookie invalid — fall through to auto-resolve
  }

  // Find first active ClientContact for this user
  const contact = await prisma.clientContact.findFirst({
    where: { clerkUserId: user.clerkUserId, isActive: true },
    include: { client: { include: clientInclude } },
    orderBy: { createdAt: "asc" },
  });

  if (contact && contact.client.isActive) {
    return {
      client: contact.client,
      accessType: contact.isPrimary ? "primary" : "contact",
      contact,
      permissions: permissionsFromContact(contact),
      userEmail: user.email,
    };
  }

  return null;
});

/**
 * Validate that a user has access to a specific client (for cookie-based switching).
 */
async function resolveForClient(
  clientId: string,
  clerkUserId: string,
  email: string
): Promise<ClientContext | null> {
  const contact = await prisma.clientContact.findFirst({
    where: {
      clientId,
      clerkUserId,
      isActive: true,
    },
    include: { client: { include: clientInclude } },
  });

  if (!contact || !contact.client.isActive) return null;

  return {
    client: contact.client,
    accessType: contact.isPrimary ? "primary" : "contact",
    contact,
    permissions: permissionsFromContact(contact),
    userEmail: email,
  };
}

/**
 * Get all clients a user can access (for the client switcher).
 */
export const getAccessibleClients = cache(async (): Promise<
  { id: string; name: string; accessType: "primary" | "contact" }[]
> => {
  const user = await getAuthUser();
  if (!user) return [];

  const contacts = await prisma.clientContact.findMany({
    where: { clerkUserId: user.clerkUserId, isActive: true },
    include: {
      client: { select: { id: true, name: true, isActive: true } },
    },
  });

  const results: { id: string; name: string; accessType: "primary" | "contact" }[] = [];
  for (const c of contacts) {
    if (c.client.isActive && !results.some((r) => r.id === c.client.id)) {
      results.push({
        id: c.client.id,
        name: c.client.name,
        accessType: c.isPrimary ? "primary" : "contact",
      });
    }
  }

  return results;
});
