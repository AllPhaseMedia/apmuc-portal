"use server";

import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
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
};

export async function listClerkUsers(): Promise<ClerkUserInfo[]> {
  await requireAdmin();

  const clerk = await clerkClient();
  const { data: users } = await clerk.users.getUserList({
    limit: 100,
    orderBy: "-last_sign_in_at",
  });

  return users.map((u) => ({
    id: u.id,
    email: u.emailAddresses[0]?.emailAddress ?? "",
    name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || (u.emailAddresses[0]?.emailAddress ?? "Unknown"),
    role: (u.publicMetadata as Record<string, string>)?.role ?? "client",
    imageUrl: u.imageUrl,
    lastSignInAt: u.lastSignInAt,
  }));
}

export async function setUserRole(clerkUserId: string, role: "admin" | "employee" | "client") {
  await requireAdmin();

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { role: role === "client" ? undefined : role },
  });

  revalidatePath("/admin/users");
  return { success: true };
}
