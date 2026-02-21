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

// Contact permissions
export type ContactPermission = "dashboard" | "billing" | "analytics" | "uptime" | "support" | "siteHealth";
export type ContactPermissions = Record<ContactPermission, boolean>;
export const ALL_PERMISSIONS: ContactPermission[] = ["dashboard", "billing", "analytics", "uptime", "support", "siteHealth"];
export const PERMISSION_LABELS: Record<ContactPermission, string> = {
  dashboard: "Dashboard Overview",
  billing: "Billing & Invoices",
  analytics: "Analytics",
  uptime: "Uptime Monitoring",
  support: "Support Tickets",
  siteHealth: "Site Health",
};

export * from "./forms";
export * from "./branding";
