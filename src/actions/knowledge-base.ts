"use server";

import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import type { ActionResult } from "@/types";

const feedbackSchema = z.object({
  articleId: z.string().uuid(),
  helpful: z.boolean(),
});

export async function getPublishedCategories() {
  try {
    await requireAuth();
    const categories = await prisma.kBCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: {
            articles: { where: { status: "PUBLISHED" } },
          },
        },
      },
    });

    // Only return categories that have published articles
    const withArticles = categories.filter((c) => c._count.articles > 0);
    return { success: true as const, data: withArticles };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch categories",
    };
  }
}

export async function getArticlesByCategory(categorySlug: string) {
  try {
    await requireAuth();
    const category = await prisma.kBCategory.findUnique({
      where: { slug: categorySlug },
      include: {
        articles: {
          where: { status: "PUBLISHED" },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!category) {
      return { success: false as const, error: "Category not found" };
    }

    return { success: true as const, data: category };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch articles",
    };
  }
}

export async function getPublishedArticle(slug: string) {
  try {
    await requireAuth();
    const article = await prisma.kBArticle.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: {
        category: true,
        feedback: {
          select: { helpful: true },
        },
      },
    });

    if (!article) {
      return { success: false as const, error: "Article not found" };
    }

    const helpfulCount = article.feedback.filter((f) => f.helpful).length;
    const notHelpfulCount = article.feedback.filter((f) => !f.helpful).length;

    return {
      success: true as const,
      data: {
        ...article,
        helpfulCount,
        notHelpfulCount,
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch article",
    };
  }
}

export async function searchArticles(query: string) {
  try {
    await requireAuth();

    if (!query || query.trim().length < 2) {
      return { success: true as const, data: [] };
    }

    const articles = await prisma.kBArticle.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: { contains: query } },
          { content: { contains: query } },
          { excerpt: { contains: query } },
        ],
      },
      include: { category: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    return { success: true as const, data: articles };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Search failed",
    };
  }
}

export async function submitFeedback(
  articleId: string,
  helpful: boolean
): Promise<ActionResult<null>> {
  try {
    const parsed = feedbackSchema.safeParse({ articleId, helpful });
    if (!parsed.success) {
      return { success: false, error: "Invalid input" };
    }

    const user = await requireAuth();

    // Find client via ClientContact for this user
    const contact = await prisma.clientContact.findFirst({
      where: { clerkUserId: user.clerkUserId, isActive: true },
      select: { clientId: true },
    });

    await prisma.articleFeedback.create({
      data: {
        articleId: parsed.data.articleId,
        helpful: parsed.data.helpful,
        clientId: contact?.clientId ?? null,
      },
    });

    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit feedback",
    };
  }
}
