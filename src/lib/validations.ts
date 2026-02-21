import { z } from "zod/v4";

// ============================================================
// CLIENT SCHEMAS
// ============================================================

export const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
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
  formId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

// ============================================================
// FORM BUILDER SCHEMAS
// ============================================================

export const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum([
    "text", "textarea", "email", "phone",
    "select", "checkbox", "radio", "file", "html", "heading", "divider",
  ]),
  label: z.string().min(1, "Label is required"),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  width: z.enum(["full", "half"]).optional(),
  order: z.number(),
  conditions: z.array(z.object({
    fieldId: z.string(),
    operator: z.enum(["equals", "notEquals", "contains", "isEmpty", "isNotEmpty"]),
    value: z.string().optional(),
  })).optional(),
  prefillKey: z.enum(["name", "email", "website", "serviceName"]).optional(),
  maxFileSize: z.number().positive().optional(),
  acceptedTypes: z.string().optional(),
  htmlContent: z.string().optional(),
});

export const formSettingsSchema = z.object({
  type: z.enum(["standard", "helpscout"]).default("standard"),
  emailNotification: z.boolean().default(true),
  emailTo: z.string().email("Must be a valid email").or(z.literal("")),
  storeSubmissions: z.boolean().default(true),
  webhookUrl: z.string().url().nullable().default(null),
  submitButtonLabel: z.string().min(1).default("Submit"),
  successMessage: z.string().min(1).default("Thanks! We'll be in touch."),
  redirectUrl: z.string().url().nullable().default(null),
});

export const formSchema = z.object({
  name: z.string().min(1, "Form name is required"),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  fields: z.array(formFieldSchema),
  settings: formSettingsSchema,
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(false),
});

export type FormValues = z.infer<typeof formSchema>;
export type FormFieldValues = z.infer<typeof formFieldSchema>;
export type FormSettingsValues = z.infer<typeof formSettingsSchema>;
