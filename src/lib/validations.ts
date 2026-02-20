import { z } from "zod/v4";

// ============================================================
// CLIENT SCHEMAS
// ============================================================

export const clientFormSchema = z.object({
  email: z.email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  websiteUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  stripeCustomerId: z.string().optional().or(z.literal("")),
  umamiSiteId: z.string().optional().or(z.literal("")),
  uptimeKumaMonitorId: z.string().optional().or(z.literal("")),
  gaPropertyId: z.string().optional().or(z.literal("")),
  searchConsoleUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

export const clientServicesSchema = z.object({
  services: z.array(z.string()),
});

// ============================================================
// KNOWLEDGE BASE SCHEMAS
// ============================================================

export const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  description: z.string().optional().or(z.literal("")),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const articleFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  categoryId: z.string().min(1, "Category is required"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
});

export type ArticleFormValues = z.infer<typeof articleFormSchema>;

// ============================================================
// RECOMMENDED SERVICE SCHEMAS
// ============================================================

export const serviceFormSchema = z.object({
  type: z.enum([
    "HOSTING", "MAINTENANCE", "SEO", "GOOGLE_ADS", "SOCIAL_MEDIA",
    "WEB_DESIGN", "EMAIL_MARKETING", "CONTENT_WRITING", "BRANDING", "OTHER",
  ]),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  features: z.string().optional().or(z.literal("")),
  ctaUrl: z.string().optional().or(z.literal("")),
  ctaLabel: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;
