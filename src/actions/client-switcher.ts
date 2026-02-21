"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ACTIVE_CLIENT_COOKIE = "apmuc_active_client";

export async function switchActiveClient(clientId: string) {
  const user = await requireAuth();

  // Validate user has access via ClientContact
  const contact = await prisma.clientContact.findFirst({
    where: { clientId, clerkUserId: user.clerkUserId, isActive: true },
    select: { id: true },
  });

  if (!contact) {
    throw new Error("Access denied");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CLIENT_COOKIE, clientId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  revalidatePath("/");
}
