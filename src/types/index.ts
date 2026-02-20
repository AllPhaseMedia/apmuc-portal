import type { Client, ClientService, SiteCheck, KBCategory, KBArticle } from "@prisma/client";

// Server action return type
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Client with relations
export type ClientWithServices = Client & {
  services: ClientService[];
};

export type ClientWithAll = Client & {
  services: ClientService[];
  siteChecks: SiteCheck[];
};

// KB article with category
export type ArticleWithCategory = KBArticle & {
  category: KBCategory;
};

// KB category with article count
export type CategoryWithCount = KBCategory & {
  _count: { articles: number };
};
