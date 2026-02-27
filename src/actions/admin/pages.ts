"use server";

import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/types";

const pageSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase with hyphens only"
    ),
  content: z.string(),
  isPublished: z.boolean(),
});

type PageValues = z.infer<typeof pageSchema>;

export async function listPages() {
  await requireStaff();
  return prisma.customPage.findMany({
    orderBy: { title: "asc" },
  });
}

export async function getPage(id: string) {
  await requireStaff();
  return prisma.customPage.findUnique({ where: { id } });
}

export async function createPage(
  values: PageValues
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireStaff();

    const parsed = pageSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const existing = await prisma.customPage.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (existing) {
      return { success: false, error: "A page with this slug already exists" };
    }

    const page = await prisma.customPage.create({
      data: parsed.data,
    });

    revalidatePath("/admin/pages");
    return { success: true, data: { id: page.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create page",
    };
  }
}

export async function updatePage(
  id: string,
  values: PageValues
): Promise<ActionResult<null>> {
  try {
    await requireStaff();

    const parsed = pageSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    // Check slug uniqueness (exclude current page)
    const existing = await prisma.customPage.findFirst({
      where: { slug: parsed.data.slug, NOT: { id } },
    });
    if (existing) {
      return { success: false, error: "A page with this slug already exists" };
    }

    await prisma.customPage.update({
      where: { id },
      data: parsed.data,
    });

    revalidatePath("/admin/pages");
    revalidatePath(`/pages/${parsed.data.slug}`);
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update page",
    };
  }
}

export async function deletePage(
  id: string
): Promise<ActionResult<null>> {
  try {
    await requireStaff();
    await prisma.customPage.delete({ where: { id } });
    revalidatePath("/admin/pages");
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete page",
    };
  }
}

// Public — no auth required (used by the /pages/[slug] route)
export async function getPublishedPage(slug: string) {
  return prisma.customPage.findFirst({
    where: { slug, isPublished: true },
  });
}
