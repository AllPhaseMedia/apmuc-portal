"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { serviceFormSchema, type ServiceFormValues } from "@/lib/validations";
import type { ActionResult } from "@/types";
import type { RecommendedService } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getRecommendedServices() {
  try {
    await requireStaff();
    const services = await prisma.recommendedService.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return { success: true as const, data: services };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to fetch services" };
  }
}

export async function createRecommendedService(values: ServiceFormValues): Promise<ActionResult<RecommendedService>> {
  try {
    await requireStaff();
    const parsed = serviceFormSchema.safeParse(values);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const data = parsed.data;
    const features = data.features
      ? data.features.split("\n").map((f) => f.trim()).filter(Boolean)
      : [];

    const service = await prisma.recommendedService.create({
      data: {
        type: data.type,
        title: data.title,
        description: data.description,
        features,
        ctaUrl: data.ctaUrl || null,
        ctaLabel: data.ctaLabel || "Learn More",
        formId: data.formId || null,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/services");
    return { success: true, data: service };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create service" };
  }
}

export async function updateRecommendedService(
  id: string,
  values: ServiceFormValues
): Promise<ActionResult<RecommendedService>> {
  try {
    await requireStaff();
    const parsed = serviceFormSchema.safeParse(values);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const data = parsed.data;
    const features = data.features
      ? data.features.split("\n").map((f) => f.trim()).filter(Boolean)
      : [];

    const service = await prisma.recommendedService.update({
      where: { id },
      data: {
        type: data.type,
        title: data.title,
        description: data.description,
        features,
        ctaUrl: data.ctaUrl || null,
        ctaLabel: data.ctaLabel || "Learn More",
        formId: data.formId || null,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/services");
    return { success: true, data: service };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update service" };
  }
}

export async function deleteRecommendedService(id: string): Promise<ActionResult<null>> {
  try {
    await requireStaff();
    await prisma.recommendedService.delete({ where: { id } });
    revalidatePath("/admin/services");
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete service" };
  }
}
