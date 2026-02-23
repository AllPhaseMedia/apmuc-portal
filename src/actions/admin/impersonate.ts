"use server";

import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const IMPERSONATE_COOKIE = "apmuc_impersonate";

export async function startImpersonation(clerkUserId: string) {
  await requireAdmin();

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_COOKIE, clerkUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4, // 4 hours
  });

  revalidatePath("/");
  return { success: true };
}

export async function stopImpersonation() {
  await requireAdmin();

  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATE_COOKIE);

  revalidatePath("/");
  return { success: true };
}

export type ClerkUserInfo = {
  id: string;
  email: string;
  name: string;
  role: string;
  imageUrl: string;
  lastSignInAt: number | null;
  linkedClients: { id: string; name: string; isPrimary: boolean }[];
};

export async function listClerkUsers(): Promise<ClerkUserInfo[]> {
  await requireAdmin();

  const clerk = await clerkClient();
  const { data: users } = await clerk.users.getUserList({
    limit: 100,
    orderBy: "-last_sign_in_at",
  });

  // Batch-fetch all client contacts with client names
  const clerkIds = users.map((u) => u.id);
  const contacts = await prisma.clientContact.findMany({
    where: { clerkUserId: { in: clerkIds }, isActive: true },
    select: {
      clerkUserId: true,
      isPrimary: true,
      client: { select: { id: true, name: true } },
    },
  });

  // Group by clerkUserId
  const contactsByUser = new Map<string, { id: string; name: string; isPrimary: boolean }[]>();
  for (const c of contacts) {
    const list = contactsByUser.get(c.clerkUserId) ?? [];
    list.push({ id: c.client.id, name: c.client.name, isPrimary: c.isPrimary });
    contactsByUser.set(c.clerkUserId, list);
  }

  return users.map((u) => {
    const rawRole = (u.publicMetadata as Record<string, string>)?.role ?? "client";
    // Normalize legacy "employee" metadata to "team_member"
    const role = rawRole === "employee" ? "team_member" : rawRole;
    return {
      id: u.id,
      email: u.emailAddresses[0]?.emailAddress ?? "",
      name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || (u.emailAddresses[0]?.emailAddress ?? "Unknown"),
      role,
      imageUrl: u.imageUrl,
      lastSignInAt: u.lastSignInAt,
      linkedClients: contactsByUser.get(u.id) ?? [],
    };
  });
}

export async function setUserRole(clerkUserId: string, role: "admin" | "team_member" | "client") {
  await requireAdmin();

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { role: role === "client" ? undefined : role },
  });

  revalidatePath("/admin/users");
  return { success: true };
}
