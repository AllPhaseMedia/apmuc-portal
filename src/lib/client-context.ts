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
  contact: ClientContact | null;
  permissions: ContactPermissions;
  userEmail: string;
};

function permissionsFromContact(contact: ClientContact): ContactPermissions {
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
 * 1. Cookie `apmuc_active_client` → validate user has access
 * 2. Client.clerkUserId match → primary, all permissions
 * 3. ClientContact.clerkUserId match → contact, permissions from record
 * 4. Email-based Client match (auto-link clerkUserId)
 * 5. Email-based ClientContact match (auto-link clerkUserId)
 */
export const resolveClientContext = cache(async (): Promise<ClientContext | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const activeClientId = cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value;

  // If cookie is set, validate access and return that client
  if (activeClientId) {
    const ctx = await resolveForClient(activeClientId, user.clerkUserId, user.email);
    if (ctx) return ctx;
    // Cookie invalid — fall through to auto-resolve
  }

  // 1. Primary: Client.clerkUserId match
  let client = await prisma.client.findFirst({
    where: { clerkUserId: user.clerkUserId, isActive: true },
    include: clientInclude,
  });

  if (client) {
    return {
      client,
      accessType: "primary",
      contact: null,
      permissions: ALL_TRUE,
      userEmail: user.email,
    };
  }

  // 2. Contact: ClientContact.clerkUserId match
  const contact = await prisma.clientContact.findFirst({
    where: { clerkUserId: user.clerkUserId, isActive: true },
    include: { client: { include: clientInclude } },
  });

  if (contact && contact.client.isActive) {
    return {
      client: contact.client,
      accessType: "contact",
      contact,
      permissions: permissionsFromContact(contact),
      userEmail: user.email,
    };
  }

  // 3. Fallback: email-based Client match (auto-link)
  client = await prisma.client.findFirst({
    where: { email: user.email, clerkUserId: null, isActive: true },
    include: clientInclude,
  });

  if (client) {
    await prisma.client.update({
      where: { id: client.id },
      data: { clerkUserId: user.clerkUserId },
    });
    return {
      client,
      accessType: "primary",
      contact: null,
      permissions: ALL_TRUE,
      userEmail: user.email,
    };
  }

  // 4. Fallback: email-based ClientContact match (auto-link)
  const emailContact = await prisma.clientContact.findFirst({
    where: { email: user.email, clerkUserId: null, isActive: true },
    include: { client: { include: clientInclude } },
  });

  if (emailContact && emailContact.client.isActive) {
    await prisma.clientContact.updateMany({
      where: { email: user.email, clerkUserId: null },
      data: { clerkUserId: user.clerkUserId },
    });
    return {
      client: emailContact.client,
      accessType: "contact",
      contact: emailContact,
      permissions: permissionsFromContact(emailContact),
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
  const client = await prisma.client.findFirst({
    where: { id: clientId, isActive: true },
    include: clientInclude,
  });

  if (!client) return null;

  // Primary owner?
  if (client.clerkUserId === clerkUserId) {
    return {
      client,
      accessType: "primary",
      contact: null,
      permissions: ALL_TRUE,
      userEmail: email,
    };
  }

  // Contact?
  const contact = await prisma.clientContact.findFirst({
    where: {
      clientId,
      clerkUserId,
      isActive: true,
    },
  });

  if (contact) {
    return {
      client,
      accessType: "contact",
      contact,
      permissions: permissionsFromContact(contact),
      userEmail: email,
    };
  }

  return null;
}

/**
 * Get all clients a user can access (for the client switcher).
 */
export const getAccessibleClients = cache(async (): Promise<
  { id: string; name: string; accessType: "primary" | "contact" }[]
> => {
  const user = await getAuthUser();
  if (!user) return [];

  const results: { id: string; name: string; accessType: "primary" | "contact" }[] = [];

  // Clients where user is primary
  const primaryClients = await prisma.client.findMany({
    where: { clerkUserId: user.clerkUserId, isActive: true },
    select: { id: true, name: true },
  });
  for (const c of primaryClients) {
    results.push({ ...c, accessType: "primary" });
  }

  // Clients where user is a contact
  const contacts = await prisma.clientContact.findMany({
    where: { clerkUserId: user.clerkUserId, isActive: true },
    include: {
      client: { select: { id: true, name: true, isActive: true } },
    },
  });
  for (const c of contacts) {
    if (c.client.isActive && !results.some((r) => r.id === c.client.id)) {
      results.push({
        id: c.client.id,
        name: c.client.name,
        accessType: "contact",
      });
    }
  }

  return results;
});
