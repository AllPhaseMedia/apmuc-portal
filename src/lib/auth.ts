import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

export type AuthUser = {
  clerkUserId: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  return {
    clerkUserId: userId,
    email: user.emailAddresses[0]?.emailAddress ?? "",
    name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
    isAdmin:
      (user.publicMetadata as { role?: string })?.role === "admin",
  };
});

export const requireAuth = cache(async (): Promise<AuthUser> => {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");
  return user;
});

export const requireAdmin = cache(async (): Promise<AuthUser> => {
  const user = await requireAuth();
  if (!user.isAdmin) throw new Error("Forbidden");
  return user;
});
