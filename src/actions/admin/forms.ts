"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { formSchema, type FormValues } from "@/lib/validations";
import type { ActionResult } from "@/types";
import type { Form } from "@prisma/client";

export async function getForms(): Promise<ActionResult<(Form & { _count: { submissions: number } })[]>> {
  try {
    await requireAdmin();
    const forms = await prisma.form.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { submissions: true } } },
    });
    return { success: true, data: forms };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch forms" };
  }
}

export async function getForm(id: string): Promise<ActionResult<Form>> {
  try {
    await requireAdmin();
    const form = await prisma.form.findUnique({ where: { id } });
    if (!form) return { success: false, error: "Form not found" };
    return { success: true, data: form };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch form" };
  }
}

export async function createForm(values: FormValues): Promise<ActionResult<Form>> {
  try {
    await requireAdmin();
    const parsed = formSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Invalid form data" };
    }

    const existing = await prisma.form.findUnique({ where: { slug: parsed.data.slug } });
    if (existing) {
      return { success: false, error: "A form with this slug already exists" };
    }

    const form = await prisma.form.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        fields: parsed.data.fields as unknown as Record<string, unknown>[],
        settings: parsed.data.settings as unknown as Record<string, unknown>,
        isActive: parsed.data.isActive,
        isPublic: parsed.data.isPublic,
      },
    });

    revalidatePath("/admin/forms");
    return { success: true, data: form };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create form" };
  }
}

export async function updateForm(id: string, values: FormValues): Promise<ActionResult<Form>> {
  try {
    await requireAdmin();
    const parsed = formSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Invalid form data" };
    }

    const existing = await prisma.form.findFirst({
      where: { slug: parsed.data.slug, id: { not: id } },
    });
    if (existing) {
      return { success: false, error: "A form with this slug already exists" };
    }

    const form = await prisma.form.update({
      where: { id },
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        fields: parsed.data.fields as unknown as Record<string, unknown>[],
        settings: parsed.data.settings as unknown as Record<string, unknown>,
        isActive: parsed.data.isActive,
        isPublic: parsed.data.isPublic,
      },
    });

    revalidatePath("/admin/forms");
    revalidatePath(`/admin/forms/${id}`);
    return { success: true, data: form };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update form" };
  }
}

export async function deleteForm(id: string): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
    await prisma.form.delete({ where: { id } });
    revalidatePath("/admin/forms");
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete form" };
  }
}
