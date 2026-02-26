"use server";

import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/** List all tags (alphabetical) */
export async function listTags(): Promise<string[]> {
  await requireStaff();
  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
  return tags.map((t) => t.name);
}

/** Ensure a tag exists in the DB, then return its name */
export async function ensureTag(name: string): Promise<string> {
  await requireStaff();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Tag name cannot be empty");

  await prisma.tag.upsert({
    where: { name: trimmed },
    create: { name: trimmed },
    update: {},
  });

  return trimmed;
}

/** Delete a tag from the dictionary (does not remove from users) */
export async function deleteTag(name: string) {
  await requireStaff();
  await prisma.tag.deleteMany({ where: { name } });
  revalidatePath("/admin/users");
  return { success: true };
}
