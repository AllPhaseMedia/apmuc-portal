"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  categoryFormSchema,
  articleFormSchema,
  type CategoryFormValues,
  type ArticleFormValues,
} from "@/lib/validations";
import type { ActionResult } from "@/types";
import type { KBCategory, KBArticle } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ============================================================
// CATEGORIES
// ============================================================

export async function getCategories() {
  try {
    await requireAdmin();
    const categories = await prisma.kBCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { articles: true } } },
    });
    return { success: true as const, data: categories };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to fetch categories" };
  }
}

export async function createCategory(values: CategoryFormValues): Promise<ActionResult<KBCategory>> {
  try {
    await requireAdmin();
    const parsed = categoryFormSchema.safeParse(values);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const category = await prisma.kBCategory.create({ data: parsed.data });
    revalidatePath("/admin/knowledge-base");
    return { success: true, data: category };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { success: false, error: "A category with this slug already exists" };
    }
    return { success: false, error: error instanceof Error ? error.message : "Failed to create category" };
  }
}

export async function updateCategory(id: string, values: CategoryFormValues): Promise<ActionResult<KBCategory>> {
  try {
    await requireAdmin();
    const parsed = categoryFormSchema.safeParse(values);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const category = await prisma.kBCategory.update({ where: { id }, data: parsed.data });
    revalidatePath("/admin/knowledge-base");
    return { success: true, data: category };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update category" };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
    const articleCount = await prisma.kBArticle.count({ where: { categoryId: id } });
    if (articleCount > 0) {
      return { success: false, error: `Cannot delete: category has ${articleCount} article(s). Move or delete them first.` };
    }
    await prisma.kBCategory.delete({ where: { id } });
    revalidatePath("/admin/knowledge-base");
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete category" };
  }
}

// ============================================================
// ARTICLES
// ============================================================

export async function getArticles() {
  try {
    await requireAdmin();
    const articles = await prisma.kBArticle.findMany({
      orderBy: { updatedAt: "desc" },
      include: { category: true },
    });
    return { success: true as const, data: articles };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to fetch articles" };
  }
}

export async function getArticle(id: string) {
  try {
    await requireAdmin();
    const article = await prisma.kBArticle.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!article) return { success: false as const, error: "Article not found" };
    return { success: true as const, data: article };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to fetch article" };
  }
}

export async function createArticle(values: ArticleFormValues): Promise<ActionResult<KBArticle>> {
  try {
    await requireAdmin();
    const parsed = articleFormSchema.safeParse(values);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const data = parsed.data;
    const article = await prisma.kBArticle.create({
      data: {
        title: data.title,
        slug: data.slug,
        categoryId: data.categoryId,
        content: data.content,
        excerpt: data.excerpt || null,
        status: data.status,
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      },
    });

    revalidatePath("/admin/knowledge-base");
    revalidatePath("/knowledge-base");
    return { success: true, data: article };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { success: false, error: "An article with this slug already exists" };
    }
    return { success: false, error: error instanceof Error ? error.message : "Failed to create article" };
  }
}

export async function updateArticle(id: string, values: ArticleFormValues): Promise<ActionResult<KBArticle>> {
  try {
    await requireAdmin();
    const parsed = articleFormSchema.safeParse(values);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const data = parsed.data;
    const existing = await prisma.kBArticle.findUnique({ where: { id } });

    const article = await prisma.kBArticle.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        categoryId: data.categoryId,
        content: data.content,
        excerpt: data.excerpt || null,
        status: data.status,
        publishedAt:
          data.status === "PUBLISHED" && existing?.status !== "PUBLISHED"
            ? new Date()
            : existing?.publishedAt,
      },
    });

    revalidatePath("/admin/knowledge-base");
    revalidatePath(`/admin/knowledge-base/articles/${id}`);
    revalidatePath("/knowledge-base");
    return { success: true, data: article };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update article" };
  }
}

export async function deleteArticle(id: string): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
    await prisma.kBArticle.delete({ where: { id } });
    revalidatePath("/admin/knowledge-base");
    revalidatePath("/knowledge-base");
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete article" };
  }
}
