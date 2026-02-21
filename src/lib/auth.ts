import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { cache } from "react";

export type UserRole = "admin" | "team_member" | "client";

export type AuthUser = {
  clerkUserId: string;
  email: string;
  name: string;
  role: UserRole;
  isAdmin: boolean;
  isTeamMember: boolean;
  isStaff: boolean; // admin OR team_member
  impersonating?: {
    clerkUserId: string;
    email: string;
    name: string;
    role: UserRole;
  };
};

const IMPERSONATE_COOKIE = "apmuc_impersonate";

function resolveRole(publicMetadata: Record<string, unknown>): UserRole {
  const role = publicMetadata?.role as string | undefined;
  if (role === "admin") return "admin";
  if (role === "employee" || role === "team_member") return "team_member";
  return "client";
}

/**
 * Get the real authenticated user (ignoring impersonation).
 * Use this for permission checks on who is actually logged in.
 */
export const getRealAuthUser = cache(async (): Promise<AuthUser | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  const role = resolveRole(user.publicMetadata as Record<string, unknown>);

  return {
    clerkUserId: userId,
    email: user.emailAddresses[0]?.emailAddress ?? "",
    name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
    role,
    isAdmin: role === "admin",
    isTeamMember: role === "team_member",
    isStaff: role === "admin" || role === "team_member",
  };
});

/**
 * Get the effective user — if admin is impersonating someone,
 * returns the impersonated user's context for data access,
 * but preserves the real user info in `impersonating`.
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const realUser = await getRealAuthUser();
  if (!realUser) return null;

  // Only admins can impersonate
  if (!realUser.isAdmin) return realUser;

  const cookieStore = await cookies();
  const impersonateId = cookieStore.get(IMPERSONATE_COOKIE)?.value;
  if (!impersonateId || impersonateId === realUser.clerkUserId) return realUser;

  try {
    const clerk = await clerkClient();
    const impUser = await clerk.users.getUser(impersonateId);
    const impRole = resolveRole(impUser.publicMetadata as Record<string, unknown>);

    return {
      // Effective user context (used for data queries)
      clerkUserId: impUser.id,
      email: impUser.emailAddresses[0]?.emailAddress ?? "",
      name: `${impUser.firstName ?? ""} ${impUser.lastName ?? ""}`.trim(),
      role: impRole,
      isAdmin: impRole === "admin",
      isTeamMember: impRole === "team_member",
      isStaff: impRole === "admin" || impRole === "team_member",
      // Flag that we're impersonating (real user can still access admin)
      impersonating: {
        clerkUserId: impUser.id,
        email: impUser.emailAddresses[0]?.emailAddress ?? "",
        name: `${impUser.firstName ?? ""} ${impUser.lastName ?? ""}`.trim(),
        role: impRole,
      },
    };
  } catch {
    // If impersonated user not found, clear and return real user
    return realUser;
  }
});

export const requireAuth = cache(async (): Promise<AuthUser> => {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");
  return user;
});

export const requireAdmin = cache(async (): Promise<AuthUser> => {
  // Always check the REAL user for admin routes
  const realUser = await getRealAuthUser();
  if (!realUser) throw new Error("Unauthorized");
  if (!realUser.isAdmin) throw new Error("Forbidden");
  return realUser;
});

export const requireStaff = cache(async (): Promise<AuthUser> => {
  const realUser = await getRealAuthUser();
  if (!realUser) throw new Error("Unauthorized");
  if (!realUser.isStaff) throw new Error("Forbidden");
  return realUser;
});
