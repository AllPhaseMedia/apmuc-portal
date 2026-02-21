# Forms Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full forms module with drag-and-drop builder, dynamic form rendering, configurable submissions (email + DB + webhook), service CTA integration, and public form pages.

**Architecture:** New `Form` and `FormSubmission` Prisma models store form schemas as JSON. A shared `<FormRenderer>` client component dynamically renders forms from JSON definitions. Admin builder uses `@dnd-kit` for drag-and-drop field management. Submissions route through a server action that handles email (Nodemailer), DB storage, and webhooks based on per-form settings. `RecommendedService.formId` links services to forms for CTA integration.

**Tech Stack:** Next.js 15 (App Router), Prisma 6 (MySQL), @dnd-kit/core + @dnd-kit/sortable, Nodemailer, Zod 4, shadcn/ui, React Hook Form, Lucide icons.

**Design Doc:** `docs/plans/2026-02-21-forms-module-design.md`

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install @dnd-kit packages**

Run:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Step 2: Install Nodemailer**

Run:
```bash
npm install nodemailer
npm install -D @types/nodemailer
```

**Step 3: Verify installation**

Run: `npm ls @dnd-kit/core nodemailer`
Expected: Both packages listed without errors.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @dnd-kit and nodemailer dependencies"
```

---

## Task 2: Database Schema — Form & FormSubmission Models

**Files:**
- Modify: `prisma/schema.prisma` (add after RecommendedService model, ~line 166)

**Step 1: Add SubmissionStatus enum and Form/FormSubmission models**

Add to `prisma/schema.prisma` after the `ArticleStatus` enum (~line 24):

```prisma
enum SubmissionStatus {
  NEW
  READ
  ARCHIVED
}
```

Add after the `RecommendedService` model (~line 166):

```prisma
// ============================================================
// DYNAMIC FORMS
// ============================================================

model Form {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?  @db.Text
  fields      Json     @default("[]")
  settings    Json     @default("{}")
  isActive    Boolean  @default(true)
  isPublic    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  submissions FormSubmission[]
  services    RecommendedService[]

  @@index([slug])
  @@index([isActive])
}

model FormSubmission {
  id        String           @id @default(uuid())
  formId    String
  data      Json
  metadata  Json             @default("{}")
  status    SubmissionStatus @default(NEW)
  createdAt DateTime         @default(now())

  form      Form             @relation(fields: [formId], references: [id], onDelete: Cascade)

  @@index([formId])
  @@index([status])
  @@index([createdAt])
}
```

**Step 2: Add formId to RecommendedService**

In the existing `RecommendedService` model, add before `createdAt`:

```prisma
  formId      String?
  form        Form?       @relation(fields: [formId], references: [id], onDelete: SetNull)
```

**Step 3: Push schema to database**

Run: `npx prisma db push`
Expected: Schema synced successfully.

**Step 4: Generate Prisma Client**

Run: `npx prisma generate`
Expected: Prisma Client generated.

**Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Form and FormSubmission models, link RecommendedService.formId"
```

---

## Task 3: TypeScript Types for Form Fields & Settings

**Files:**
- Create: `src/types/forms.ts`

**Step 1: Create the form types file**

Create `src/types/forms.ts`:

```typescript
// Field types supported by the form builder
export type FormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "select"
  | "checkbox"
  | "radio"
  | "heading"
  | "divider";

// Conditional logic operators
export type ConditionOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "isEmpty"
  | "isNotEmpty";

// Show/hide condition for a field
export interface FieldCondition {
  fieldId: string;
  operator: ConditionOperator;
  value?: string;
}

// Prefill keys that map to known client data
export type PrefillKey = "name" | "email" | "website" | "serviceName";

// A single field definition in the form schema
export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // For select, radio, checkbox
  width?: "full" | "half";
  order: number;
  conditions?: FieldCondition[];
  prefillKey?: PrefillKey;
}

// Form submission handler type
export type FormHandlerType = "standard" | "helpscout";

// Per-form settings stored as JSON
export interface FormSettings {
  type: FormHandlerType;
  emailNotification: boolean;
  emailTo: string;
  storeSubmissions: boolean;
  webhookUrl: string | null;
  submitButtonLabel: string;
  successMessage: string;
  redirectUrl: string | null;
}

// Default settings for new forms
export const DEFAULT_FORM_SETTINGS: FormSettings = {
  type: "standard",
  emailNotification: true,
  emailTo: "",
  storeSubmissions: true,
  webhookUrl: null,
  submitButtonLabel: "Submit",
  successMessage: "Thanks! We'll be in touch.",
  redirectUrl: null,
};

// Prefill data passed to FormRenderer
export interface FormPrefillData {
  name?: string;
  email?: string;
  website?: string;
  serviceName?: string;
}

// Field type metadata for the builder palette
export interface FieldTypeInfo {
  type: FormFieldType;
  label: string;
  icon: string; // Lucide icon name
  hasOptions: boolean;
  hasPlaceholder: boolean;
  isLayout: boolean; // heading/divider are layout-only
}

export const FIELD_TYPES: FieldTypeInfo[] = [
  { type: "text", label: "Text", icon: "Type", hasOptions: false, hasPlaceholder: true, isLayout: false },
  { type: "textarea", label: "Textarea", icon: "AlignLeft", hasOptions: false, hasPlaceholder: true, isLayout: false },
  { type: "email", label: "Email", icon: "Mail", hasOptions: false, hasPlaceholder: true, isLayout: false },
  { type: "phone", label: "Phone", icon: "Phone", hasOptions: false, hasPlaceholder: true, isLayout: false },
  { type: "select", label: "Dropdown", icon: "ChevronDown", hasOptions: true, hasPlaceholder: true, isLayout: false },
  { type: "radio", label: "Radio", icon: "Circle", hasOptions: true, hasPlaceholder: false, isLayout: false },
  { type: "checkbox", label: "Checkbox", icon: "CheckSquare", hasOptions: true, hasPlaceholder: false, isLayout: false },
  { type: "heading", label: "Heading", icon: "Heading3", hasOptions: false, hasPlaceholder: false, isLayout: true },
  { type: "divider", label: "Divider", icon: "Minus", hasOptions: false, hasPlaceholder: false, isLayout: true },
];
```

**Step 2: Export from types index**

Add to `src/types/index.ts`:

```typescript
export * from "./forms";
```

**Step 3: Commit**

```bash
git add src/types/forms.ts src/types/index.ts
git commit -m "feat: add TypeScript types for form fields, settings, and builder"
```

---

## Task 4: Zod Validation Schemas for Forms

**Files:**
- Modify: `src/lib/validations.ts` (add form schemas at end)

**Step 1: Add form validation schemas**

Append to `src/lib/validations.ts`:

```typescript
// ============================================================
// FORM BUILDER SCHEMAS
// ============================================================

export const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum([
    "text", "textarea", "email", "phone",
    "select", "checkbox", "radio", "heading", "divider",
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
```

**Step 2: Commit**

```bash
git add src/lib/validations.ts
git commit -m "feat: add Zod validation schemas for forms, fields, and settings"
```

---

## Task 5: Email Utility (Nodemailer)

**Files:**
- Create: `src/lib/email.ts`

**Step 1: Create the email utility**

Create `src/lib/email.ts`:

```typescript
import "server-only";

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_ADDRESS = process.env.SMTP_FROM || "noreply@clientsupport.app";

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn("[email] SMTP not configured, skipping email send");
    return;
  }

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ""),
  });
}

/**
 * Build an HTML email for a form submission notification.
 */
export function buildSubmissionEmail(params: {
  formName: string;
  fields: Array<{ label: string; value: string }>;
  submittedAt: Date;
  adminUrl: string;
}): string {
  const { formName, fields, submittedAt, adminUrl } = params;

  const fieldRows = fields
    .map(
      (f) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;vertical-align:top;white-space:nowrap;">${f.label}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${f.value || "<em>—</em>"}</td></tr>`
    )
    .join("");

  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#1a1a2e;">New Submission: ${formName}</h2>
      <p style="color:#666;">Submitted on ${submittedAt.toLocaleString()}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${fieldRows}
      </table>
      <p style="margin-top:24px;">
        <a href="${adminUrl}" style="display:inline-block;padding:10px 20px;background:#e8590c;color:#fff;text-decoration:none;border-radius:6px;">
          View in Admin
        </a>
      </p>
    </div>
  `.trim();
}
```

**Step 2: Add env vars to .env.example (if it exists) or note them**

The following env vars are needed (add to `.env.local`):
```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@clientsupport.app
```

**Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: add Nodemailer email utility with submission notification template"
```

---

## Task 6: Form CRUD Server Actions

**Files:**
- Create: `src/actions/admin/forms.ts`

**Step 1: Create form admin actions**

Create `src/actions/admin/forms.ts`:

```typescript
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

    // Check slug uniqueness
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

    // Check slug uniqueness (exclude self)
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
```

**Step 2: Commit**

```bash
git add src/actions/admin/forms.ts
git commit -m "feat: add Form CRUD server actions"
```

---

## Task 7: Form Submission Server Action

**Files:**
- Create: `src/actions/forms.ts`

**Step 1: Create the submission action**

Create `src/actions/forms.ts`:

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { sendEmail, buildSubmissionEmail, isEmailConfigured } from "@/lib/email";
import { createConversation } from "@/lib/helpscout";
import type { ActionResult } from "@/types";
import type { FormField, FormSettings } from "@/types/forms";
import { BRAND } from "@/lib/constants";

export async function submitForm(
  formId: string,
  data: Record<string, string | string[]>
): Promise<ActionResult<{ message: string }>> {
  try {
    // Load form
    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form || !form.isActive) {
      return { success: false, error: "Form not found or inactive" };
    }

    const fields = form.fields as unknown as FormField[];
    const settings = form.settings as unknown as FormSettings;

    // Validate required fields
    for (const field of fields) {
      if (field.required && !field.type.match(/^(heading|divider)$/)) {
        const value = data[field.id];
        if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === "string" && value.trim() === "")) {
          return { success: false, error: `${field.label} is required` };
        }
      }
    }

    // Get client info if logged in (optional for public forms)
    const user = await getAuthUser().catch(() => null);
    let clientId: string | undefined;
    let clientEmail: string | undefined;

    if (user) {
      const client = await prisma.client.findFirst({
        where: { clerkUserId: user.clerkUserId },
      });
      if (client) {
        clientId = client.id;
        clientEmail = client.email;
      }
    }

    // Build field label/value pairs for email
    const labeledFields = fields
      .filter((f) => !f.type.match(/^(heading|divider)$/))
      .map((f) => ({
        label: f.label,
        value: Array.isArray(data[f.id]) ? (data[f.id] as string[]).join(", ") : (data[f.id] as string) || "",
      }));

    // Handle Help Scout type
    if (settings.type === "helpscout") {
      const emailValue = data[fields.find((f) => f.prefillKey === "email")?.id || ""] as string;
      const nameValue = data[fields.find((f) => f.prefillKey === "name")?.id || ""] as string;
      const bodyHtml = labeledFields
        .map((f) => `<p><strong>${f.label}:</strong> ${f.value}</p>`)
        .join("");

      await createConversation(
        emailValue || clientEmail || "unknown@unknown.com",
        nameValue || "Portal User",
        `[${form.name}] New Submission`,
        bodyHtml
      );
    }

    // Store in DB
    if (settings.storeSubmissions) {
      await prisma.formSubmission.create({
        data: {
          formId,
          data: data as Record<string, unknown>,
          metadata: {
            clientId: clientId || null,
            email: clientEmail || null,
          },
        },
      });
    }

    // Send email notification
    if (settings.emailNotification && settings.emailTo && isEmailConfigured()) {
      const adminUrl = `${BRAND.url}/admin/forms/${formId}/submissions`;
      const html = buildSubmissionEmail({
        formName: form.name,
        fields: labeledFields,
        submittedAt: new Date(),
        adminUrl,
      });

      await sendEmail({
        to: settings.emailTo,
        subject: `New submission: ${form.name}`,
        html,
      });
    }

    // Webhook
    if (settings.webhookUrl) {
      try {
        await fetch(settings.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formId,
            formName: form.name,
            data,
            submittedAt: new Date().toISOString(),
            clientId: clientId || null,
          }),
        });
      } catch {
        // Webhook failures are non-critical, log but don't fail
        console.warn(`[forms] Webhook failed for form ${formId}`);
      }
    }

    return { success: true, data: { message: settings.successMessage } };
  } catch (error) {
    console.error("[forms] Submit error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Submission failed" };
  }
}
```

**Step 2: Commit**

```bash
git add src/actions/forms.ts
git commit -m "feat: add form submission action with email, DB, webhook, and Help Scout support"
```

---

## Task 8: Submission Management Server Actions

**Files:**
- Create: `src/actions/admin/submissions.ts`

**Step 1: Create submission admin actions**

Create `src/actions/admin/submissions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult } from "@/types";
import type { FormSubmission, SubmissionStatus } from "@prisma/client";

export async function getSubmissions(
  formId: string,
  options?: { status?: SubmissionStatus; page?: number; perPage?: number }
): Promise<ActionResult<{ submissions: FormSubmission[]; total: number }>> {
  try {
    await requireAdmin();
    const page = options?.page || 1;
    const perPage = options?.perPage || 25;

    const where = {
      formId,
      ...(options?.status ? { status: options.status } : {}),
    };

    const [submissions, total] = await Promise.all([
      prisma.formSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.formSubmission.count({ where }),
    ]);

    return { success: true, data: { submissions, total } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch submissions" };
  }
}

export async function getSubmission(id: string): Promise<ActionResult<FormSubmission>> {
  try {
    await requireAdmin();
    const submission = await prisma.formSubmission.findUnique({ where: { id } });
    if (!submission) return { success: false, error: "Submission not found" };

    // Auto-mark as read
    if (submission.status === "NEW") {
      await prisma.formSubmission.update({
        where: { id },
        data: { status: "READ" },
      });
      submission.status = "READ";
    }

    return { success: true, data: submission };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch submission" };
  }
}

export async function updateSubmissionStatus(
  ids: string[],
  status: SubmissionStatus
): Promise<ActionResult<number>> {
  try {
    await requireAdmin();
    const result = await prisma.formSubmission.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    return { success: true, data: result.count };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update submissions" };
  }
}

export async function deleteSubmissions(ids: string[]): Promise<ActionResult<number>> {
  try {
    await requireAdmin();
    const result = await prisma.formSubmission.deleteMany({
      where: { id: { in: ids } },
    });
    return { success: true, data: result.count };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete submissions" };
  }
}

export async function exportSubmissionsCsv(formId: string): Promise<ActionResult<string>> {
  try {
    await requireAdmin();

    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form) return { success: false, error: "Form not found" };

    const submissions = await prisma.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: "desc" },
    });

    const fields = (form.fields as unknown as Array<{ id: string; label: string; type: string }>)
      .filter((f) => !f.type.match(/^(heading|divider)$/));

    // CSV header
    const headers = ["Submitted At", "Status", ...fields.map((f) => f.label)];
    const rows = submissions.map((s) => {
      const data = s.data as Record<string, unknown>;
      return [
        s.createdAt.toISOString(),
        s.status,
        ...fields.map((f) => {
          const val = data[f.id];
          if (Array.isArray(val)) return val.join("; ");
          return String(val || "");
        }),
      ];
    });

    const escapeCsv = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csv = [headers.map(escapeCsv).join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");

    return { success: true, data: csv };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to export submissions" };
  }
}
```

**Step 2: Commit**

```bash
git add src/actions/admin/submissions.ts
git commit -m "feat: add submission management actions (list, status, delete, CSV export)"
```

---

## Task 9: FormRenderer Component

This is the shared component that renders a form from JSON field definitions. Used in modals, standalone pages, and the builder preview.

**Files:**
- Create: `src/components/forms/form-renderer.tsx`

**Step 1: Create the FormRenderer component**

Create `src/components/forms/form-renderer.tsx`:

```tsx
"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import type { FormField, FormPrefillData, ConditionOperator } from "@/types/forms";

interface FormRendererProps {
  fields: FormField[];
  prefill?: FormPrefillData;
  submitLabel?: string;
  onSubmit: (data: Record<string, string | string[]>) => Promise<void>;
  disabled?: boolean;
  preview?: boolean; // If true, disables submit
}

function evaluateCondition(
  operator: ConditionOperator,
  fieldValue: string | string[] | undefined,
  conditionValue?: string
): boolean {
  const val = Array.isArray(fieldValue) ? fieldValue.join(", ") : (fieldValue || "");
  switch (operator) {
    case "equals":
      return val === (conditionValue || "");
    case "notEquals":
      return val !== (conditionValue || "");
    case "contains":
      return val.toLowerCase().includes((conditionValue || "").toLowerCase());
    case "isEmpty":
      return val === "";
    case "isNotEmpty":
      return val !== "";
    default:
      return true;
  }
}

export function FormRenderer({
  fields,
  prefill,
  submitLabel = "Submit",
  onSubmit,
  disabled = false,
  preview = false,
}: FormRendererProps) {
  // Initialize form data from prefill
  const initialData = useMemo(() => {
    const data: Record<string, string | string[]> = {};
    for (const field of fields) {
      if (field.prefillKey && prefill) {
        const prefillValue = prefill[field.prefillKey];
        if (prefillValue) {
          data[field.id] = prefillValue;
        }
      }
    }
    return data;
  }, [fields, prefill]);

  const [formData, setFormData] = useState<Record<string, string | string[]>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const setValue = useCallback((fieldId: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  // Check if a field should be visible based on conditions
  const isFieldVisible = useCallback(
    (field: FormField): boolean => {
      if (!field.conditions || field.conditions.length === 0) return true;
      // AND logic: all conditions must pass
      return field.conditions.every((cond) =>
        evaluateCondition(cond.operator, formData[cond.fieldId], cond.value)
      );
    },
    [formData]
  );

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (!isFieldVisible(field)) continue;
      if (field.required && !field.type.match(/^(heading|divider)$/)) {
        const val = formData[field.id];
        if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === "string" && val.trim() === "")) {
          newErrors[field.id] = `${field.label} is required`;
        }
      }
      // Email validation
      if (field.type === "email" && formData[field.id]) {
        const emailVal = formData[field.id] as string;
        if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
          newErrors[field.id] = "Please enter a valid email address";
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [fields, formData, isFieldVisible]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preview || disabled) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => a.order - b.order),
    [fields]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {sortedFields.map((field) => {
          if (!isFieldVisible(field)) return null;

          const widthClass = field.width === "half" ? "w-full sm:w-[calc(50%-0.5rem)]" : "w-full";

          // Heading
          if (field.type === "heading") {
            return (
              <div key={field.id} className={widthClass}>
                <h3 className="text-lg font-semibold mt-2">{field.label}</h3>
              </div>
            );
          }

          // Divider
          if (field.type === "divider") {
            return (
              <div key={field.id} className="w-full">
                <hr className="my-2 border-border" />
              </div>
            );
          }

          const error = errors[field.id];

          return (
            <div key={field.id} className={`${widthClass} space-y-1.5`}>
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>

              {/* Text / Email / Phone */}
              {(field.type === "text" || field.type === "email" || field.type === "phone") && (
                <Input
                  id={field.id}
                  type={field.type === "phone" ? "tel" : field.type}
                  placeholder={field.placeholder}
                  value={(formData[field.id] as string) || ""}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  disabled={disabled}
                />
              )}

              {/* Textarea */}
              {field.type === "textarea" && (
                <Textarea
                  id={field.id}
                  placeholder={field.placeholder}
                  value={(formData[field.id] as string) || ""}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  disabled={disabled}
                  rows={4}
                />
              )}

              {/* Select */}
              {field.type === "select" && (
                <Select
                  value={(formData[field.id] as string) || ""}
                  onValueChange={(val) => setValue(field.id, val)}
                  disabled={disabled}
                >
                  <SelectTrigger id={field.id}>
                    <SelectValue placeholder={field.placeholder || "Select..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Radio */}
              {field.type === "radio" && (
                <RadioGroup
                  value={(formData[field.id] as string) || ""}
                  onValueChange={(val) => setValue(field.id, val)}
                  disabled={disabled}
                >
                  {field.options?.map((opt) => (
                    <div key={opt} className="flex items-center gap-2">
                      <RadioGroupItem value={opt} id={`${field.id}-${opt}`} />
                      <Label htmlFor={`${field.id}-${opt}`} className="font-normal">
                        {opt}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {/* Checkbox */}
              {field.type === "checkbox" && (
                <div className="space-y-2">
                  {field.options?.map((opt) => {
                    const checked = ((formData[field.id] as string[]) || []).includes(opt);
                    return (
                      <div key={opt} className="flex items-center gap-2">
                        <Checkbox
                          id={`${field.id}-${opt}`}
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={(isChecked) => {
                            const current = (formData[field.id] as string[]) || [];
                            setValue(
                              field.id,
                              isChecked
                                ? [...current, opt]
                                : current.filter((v) => v !== opt)
                            );
                          }}
                        />
                        <Label htmlFor={`${field.id}-${opt}`} className="font-normal">
                          {opt}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          );
        })}
      </div>

      {!preview && (
        <Button type="submit" disabled={disabled || submitting} className="w-full sm:w-auto">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      )}
    </form>
  );
}
```

**Step 2: Verify shadcn components exist**

Check that these components exist (they should based on the codebase exploration):
- `src/components/ui/checkbox.tsx` — if missing, run: `npx shadcn@latest add checkbox`
- `src/components/ui/radio-group.tsx` — if missing, run: `npx shadcn@latest add radio-group`

Run: `ls src/components/ui/checkbox.tsx src/components/ui/radio-group.tsx`

If either is missing, install them.

**Step 3: Commit**

```bash
git add src/components/forms/form-renderer.tsx
git commit -m "feat: add FormRenderer component with all field types and conditional logic"
```

---

## Task 10: Form Builder — Field Palette & Sortable List

**Files:**
- Create: `src/components/admin/form-builder/field-palette.tsx`
- Create: `src/components/admin/form-builder/sortable-field.tsx`
- Create: `src/components/admin/form-builder/field-list.tsx`

**Step 1: Create the field palette (draggable field type buttons)**

Create `src/components/admin/form-builder/field-palette.tsx`:

```tsx
"use client";

import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import {
  Type,
  AlignLeft,
  Mail,
  Phone,
  ChevronDown,
  Circle,
  CheckSquare,
  Heading3,
  Minus,
} from "lucide-react";
import type { FormFieldType } from "@/types/forms";
import { FIELD_TYPES } from "@/types/forms";

const ICONS: Record<string, React.ElementType> = {
  Type,
  AlignLeft,
  Mail,
  Phone,
  ChevronDown,
  Circle,
  CheckSquare,
  Heading3,
  Minus,
};

function PaletteItem({ type, label, icon }: { type: FormFieldType; label: string; icon: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type, fromPalette: true },
  });

  const Icon = ICONS[icon] || Type;

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm",
        "hover:bg-accent hover:text-accent-foreground cursor-grab active:cursor-grabbing",
        "transition-colors",
        isDragging && "opacity-50"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

export function FieldPalette() {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Add Fields</h4>
      <div className="flex flex-wrap gap-2">
        {FIELD_TYPES.map((ft) => (
          <PaletteItem key={ft.type} type={ft.type} label={ft.label} icon={ft.icon} />
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Create the sortable field card**

Create `src/components/admin/form-builder/sortable-field.tsx`:

```tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { GripVertical, Trash2, Settings2 } from "lucide-react";
import {
  Type, AlignLeft, Mail, Phone, ChevronDown, Circle, CheckSquare, Heading3, Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormField } from "@/types/forms";

const ICONS: Record<string, React.ElementType> = {
  text: Type, textarea: AlignLeft, email: Mail, phone: Phone,
  select: ChevronDown, radio: Circle, checkbox: CheckSquare,
  heading: Heading3, divider: Minus,
};

interface SortableFieldProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function SortableField({ field, isSelected, onSelect, onDelete }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = ICONS[field.type] || Type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border p-2 bg-background",
        "transition-colors",
        isSelected && "border-primary ring-1 ring-primary",
        isDragging && "opacity-50 shadow-lg",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />

      <button
        type="button"
        onClick={onSelect}
        className="flex-1 text-left text-sm truncate"
      >
        {field.label || <span className="text-muted-foreground italic">Untitled</span>}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </button>

      <span className="text-xs text-muted-foreground">{field.type}</span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onSelect}
      >
        <Settings2 className="h-3.5 w-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
```

**Step 3: Create the sortable field list container**

Create `src/components/admin/form-builder/field-list.tsx`:

```tsx
"use client";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { SortableField } from "./sortable-field";
import type { FormField } from "@/types/forms";

interface FieldListProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onDeleteField: (id: string) => void;
}

export function FieldList({ fields, selectedFieldId, onSelectField, onDeleteField }: FieldListProps) {
  const { setNodeRef } = useDroppable({ id: "field-list" });

  const sorted = [...fields].sort((a, b) => a.order - b.order);

  return (
    <div ref={setNodeRef} className="space-y-2 min-h-[100px]">
      {sorted.length === 0 && (
        <div className="flex items-center justify-center rounded-md border border-dashed p-8 text-sm text-muted-foreground">
          Drag fields here to build your form
        </div>
      )}
      <SortableContext items={sorted.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        {sorted.map((field) => (
          <SortableField
            key={field.id}
            field={field}
            isSelected={field.id === selectedFieldId}
            onSelect={() => onSelectField(field.id)}
            onDelete={() => onDeleteField(field.id)}
          />
        ))}
      </SortableContext>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/admin/form-builder/
git commit -m "feat: add form builder palette, sortable field cards, and field list"
```

---

## Task 11: Form Builder — Field Configuration Panel

**Files:**
- Create: `src/components/admin/form-builder/field-config.tsx`

**Step 1: Create the field configuration panel**

Create `src/components/admin/form-builder/field-config.tsx`:

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import type { FormField, ConditionOperator, PrefillKey } from "@/types/forms";

interface FieldConfigProps {
  field: FormField;
  allFields: FormField[];
  onChange: (updated: FormField) => void;
  onClose: () => void;
}

export function FieldConfig({ field, allFields, onChange, onClose }: FieldConfigProps) {
  const hasOptions = ["select", "radio", "checkbox"].includes(field.type);
  const hasPlaceholder = ["text", "textarea", "email", "phone", "select"].includes(field.type);
  const isLayout = ["heading", "divider"].includes(field.type);

  const otherFields = allFields.filter(
    (f) => f.id !== field.id && !["heading", "divider"].includes(f.type)
  );

  return (
    <div className="space-y-4 p-4 border rounded-md bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Configure: {field.type}</h4>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Label */}
      <div className="space-y-1.5">
        <Label>Label</Label>
        <Input
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="Field label"
        />
      </div>

      {/* Placeholder */}
      {hasPlaceholder && (
        <div className="space-y-1.5">
          <Label>Placeholder</Label>
          <Input
            value={field.placeholder || ""}
            onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
            placeholder="Placeholder text"
          />
        </div>
      )}

      {/* Required */}
      {!isLayout && (
        <div className="flex items-center justify-between">
          <Label>Required</Label>
          <Switch
            checked={field.required || false}
            onCheckedChange={(checked) => onChange({ ...field, required: checked })}
          />
        </div>
      )}

      {/* Width */}
      {!isLayout && (
        <div className="space-y-1.5">
          <Label>Width</Label>
          <Select
            value={field.width || "full"}
            onValueChange={(val) => onChange({ ...field, width: val as "full" | "half" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full Width</SelectItem>
              <SelectItem value="half">Half Width</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Prefill Key */}
      {!isLayout && (
        <div className="space-y-1.5">
          <Label>Auto-fill from</Label>
          <Select
            value={field.prefillKey || "none"}
            onValueChange={(val) =>
              onChange({ ...field, prefillKey: val === "none" ? undefined : (val as PrefillKey) })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="name">Client Name</SelectItem>
              <SelectItem value="email">Client Email</SelectItem>
              <SelectItem value="website">Client Website</SelectItem>
              <SelectItem value="serviceName">Service Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Options (for select, radio, checkbox) */}
      {hasOptions && (
        <div className="space-y-1.5">
          <Label>Options (one per line)</Label>
          <Textarea
            value={(field.options || []).join("\n")}
            onChange={(e) =>
              onChange({
                ...field,
                options: e.target.value.split("\n").filter((o) => o.trim() !== ""),
              })
            }
            placeholder={"Option 1\nOption 2\nOption 3"}
            rows={4}
          />
        </div>
      )}

      {/* Conditional Show/Hide */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Show/Hide Conditions</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...field,
                conditions: [
                  ...(field.conditions || []),
                  { fieldId: "", operator: "equals" as ConditionOperator, value: "" },
                ],
              })
            }
            disabled={otherFields.length === 0}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Condition
          </Button>
        </div>

        {field.conditions?.map((cond, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <Select
              value={cond.fieldId}
              onValueChange={(val) => {
                const conditions = [...(field.conditions || [])];
                conditions[idx] = { ...conditions[idx], fieldId: val };
                onChange({ ...field, conditions });
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Field..." />
              </SelectTrigger>
              <SelectContent>
                {otherFields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={cond.operator}
              onValueChange={(val) => {
                const conditions = [...(field.conditions || [])];
                conditions[idx] = { ...conditions[idx], operator: val as ConditionOperator };
                onChange({ ...field, conditions });
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">equals</SelectItem>
                <SelectItem value="notEquals">not equals</SelectItem>
                <SelectItem value="contains">contains</SelectItem>
                <SelectItem value="isEmpty">is empty</SelectItem>
                <SelectItem value="isNotEmpty">is not empty</SelectItem>
              </SelectContent>
            </Select>

            {!["isEmpty", "isNotEmpty"].includes(cond.operator) && (
              <Input
                value={cond.value || ""}
                onChange={(e) => {
                  const conditions = [...(field.conditions || [])];
                  conditions[idx] = { ...conditions[idx], value: e.target.value };
                  onChange({ ...field, conditions });
                }}
                placeholder="Value"
                className="w-[120px]"
              />
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => {
                const conditions = (field.conditions || []).filter((_, i) => i !== idx);
                onChange({ ...field, conditions });
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/admin/form-builder/field-config.tsx
git commit -m "feat: add field configuration panel with conditions, options, and prefill"
```

---

## Task 12: Form Builder — Settings Panel

**Files:**
- Create: `src/components/admin/form-builder/form-settings-panel.tsx`

**Step 1: Create the form settings panel**

Create `src/components/admin/form-builder/form-settings-panel.tsx`:

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { FormSettings, FormHandlerType } from "@/types/forms";

interface FormSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: FormSettings;
  onChange: (settings: FormSettings) => void;
}

export function FormSettingsPanel({ open, onOpenChange, settings, onChange }: FormSettingsPanelProps) {
  const update = (partial: Partial<FormSettings>) => {
    onChange({ ...settings, ...partial });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Form Settings</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Handler Type */}
          <div className="space-y-1.5">
            <Label>Submission Handler</Label>
            <Select
              value={settings.type}
              onValueChange={(val) => update({ type: val as FormHandlerType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (DB + Email)</SelectItem>
                <SelectItem value="helpscout">Help Scout (Create Ticket)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {settings.type === "helpscout"
                ? "Submissions create Help Scout conversations"
                : "Submissions stored in database with optional email"}
            </p>
          </div>

          {/* Store Submissions */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Store Submissions</Label>
              <p className="text-xs text-muted-foreground">Save responses in the portal database</p>
            </div>
            <Switch
              checked={settings.storeSubmissions}
              onCheckedChange={(checked) => update({ storeSubmissions: checked })}
            />
          </div>

          {/* Email Notification */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notification</Label>
                <p className="text-xs text-muted-foreground">Send email when form is submitted</p>
              </div>
              <Switch
                checked={settings.emailNotification}
                onCheckedChange={(checked) => update({ emailNotification: checked })}
              />
            </div>
            {settings.emailNotification && (
              <div className="space-y-1.5">
                <Label>Send to</Label>
                <Input
                  type="email"
                  value={settings.emailTo}
                  onChange={(e) => update({ emailTo: e.target.value })}
                  placeholder="admin@example.com"
                />
              </div>
            )}
          </div>

          {/* Webhook */}
          <div className="space-y-1.5">
            <Label>Webhook URL (optional)</Label>
            <Input
              type="url"
              value={settings.webhookUrl || ""}
              onChange={(e) => update({ webhookUrl: e.target.value || null })}
              placeholder="https://example.com/webhook"
            />
            <p className="text-xs text-muted-foreground">POST JSON payload on each submission</p>
          </div>

          {/* Submit Button Label */}
          <div className="space-y-1.5">
            <Label>Submit Button Label</Label>
            <Input
              value={settings.submitButtonLabel}
              onChange={(e) => update({ submitButtonLabel: e.target.value })}
              placeholder="Submit"
            />
          </div>

          {/* Success Message */}
          <div className="space-y-1.5">
            <Label>Success Message</Label>
            <Textarea
              value={settings.successMessage}
              onChange={(e) => update({ successMessage: e.target.value })}
              placeholder="Thanks! We'll be in touch."
              rows={3}
            />
          </div>

          {/* Redirect URL */}
          <div className="space-y-1.5">
            <Label>Redirect URL (optional)</Label>
            <Input
              type="url"
              value={settings.redirectUrl || ""}
              onChange={(e) => update({ redirectUrl: e.target.value || null })}
              placeholder="https://example.com/thank-you"
            />
            <p className="text-xs text-muted-foreground">
              Redirect after submission instead of showing success message
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**Step 2: Check if Sheet component exists**

Run: `ls src/components/ui/sheet.tsx`

If missing, run: `npx shadcn@latest add sheet`

**Step 3: Commit**

```bash
git add src/components/admin/form-builder/form-settings-panel.tsx
git commit -m "feat: add form settings panel (email, webhook, handler type, success message)"
```

---

## Task 13: Form Builder — Main Builder Page Component

**Files:**
- Create: `src/components/admin/form-builder/form-builder.tsx`
- Create: `src/components/admin/form-builder/index.ts`

**Step 1: Create the main form builder component**

Create `src/components/admin/form-builder/form-builder.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, Loader2, Eye } from "lucide-react";
import { FieldPalette } from "./field-palette";
import { FieldList } from "./field-list";
import { FieldConfig } from "./field-config";
import { FormSettingsPanel } from "./form-settings-panel";
import { FormRenderer } from "@/components/forms/form-renderer";
import { createForm, updateForm } from "@/actions/admin/forms";
import type { FormField, FormSettings } from "@/types/forms";
import { DEFAULT_FORM_SETTINGS } from "@/types/forms";
import type { Form } from "@prisma/client";

interface FormBuilderProps {
  form?: Form; // Undefined = creating new form
}

function generateFieldId(): string {
  return `field_${Math.random().toString(36).substring(2, 10)}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function FormBuilder({ form }: FormBuilderProps) {
  const router = useRouter();
  const isEdit = !!form;

  // Form metadata
  const [name, setName] = useState(form?.name || "");
  const [slug, setSlug] = useState(form?.slug || "");
  const [description, setDescription] = useState(form?.description || "");
  const [isActive, setIsActive] = useState(form?.isActive ?? true);
  const [isPublic, setIsPublic] = useState(form?.isPublic ?? false);

  // Fields
  const [fields, setFields] = useState<FormField[]>(
    (form?.fields as unknown as FormField[]) || []
  );

  // Settings
  const [settings, setSettings] = useState<FormSettings>(
    form?.settings
      ? { ...DEFAULT_FORM_SETTINGS, ...(form.settings as unknown as Partial<FormSettings>) }
      : { ...DEFAULT_FORM_SETTINGS }
  );

  // UI state
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [autoSlug, setAutoSlug] = useState(!isEdit);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Auto-generate slug from name
  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      if (autoSlug) {
        setSlug(slugify(value));
      }
    },
    [autoSlug]
  );

  // Add new field from palette drop
  const addField = useCallback((type: FormField["type"]) => {
    const newField: FormField = {
      id: generateFieldId(),
      type,
      label: type === "heading" ? "Section Title" : type === "divider" ? "" : `New ${type} field`,
      order: fields.length,
      required: false,
      width: "full",
    };
    if (["select", "radio", "checkbox"].includes(type)) {
      newField.options = ["Option 1", "Option 2"];
    }
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setShowPreview(false);
  }, [fields.length]);

  // Handle drag events
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    // Dropping from palette
    if (active.data.current?.fromPalette) {
      addField(active.data.current.type);
      return;
    }

    // Reordering existing fields
    if (active.id !== over.id) {
      setFields((prev) => {
        const sorted = [...prev].sort((a, b) => a.order - b.order);
        const oldIndex = sorted.findIndex((f) => f.id === active.id);
        const newIndex = sorted.findIndex((f) => f.id === over.id);
        const reordered = arrayMove(sorted, oldIndex, newIndex);
        return reordered.map((f, i) => ({ ...f, order: i }));
      });
    }
  };

  // Update a field
  const updateField = useCallback((updated: FormField) => {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }, []);

  // Delete a field
  const deleteField = useCallback(
    (id: string) => {
      setFields((prev) => {
        const filtered = prev.filter((f) => f.id !== id);
        return filtered.map((f, i) => ({ ...f, order: i }));
      });
      if (selectedFieldId === id) setSelectedFieldId(null);
    },
    [selectedFieldId]
  );

  // Save form
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Form name is required");
      return;
    }
    if (!slug.trim()) {
      toast.error("Slug is required");
      return;
    }

    setSaving(true);
    try {
      const values = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        fields,
        settings,
        isActive,
        isPublic,
      };

      const result = isEdit
        ? await updateForm(form.id, values)
        : await createForm(values);

      if (result.success) {
        toast.success(isEdit ? "Form updated" : "Form created");
        if (!isEdit) {
          router.push(`/admin/forms/${result.data.id}`);
        }
      } else {
        toast.error(result.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <Label>Form Name</Label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Form"
            />
          </div>
          <div className="w-[200px] space-y-1.5">
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setAutoSlug(false);
              }}
              placeholder="my-form"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
              <Label htmlFor="active">Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isPublic} onCheckedChange={setIsPublic} id="public" />
              <Label htmlFor="public">Public</Label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-1.5" />
              {showPreview ? "Edit" : "Preview"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4 mr-1.5" />
              Settings
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              Save
            </Button>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label>Description (optional)</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description shown above the form"
          />
        </div>

        {/* Main content */}
        {showPreview ? (
          <div className="max-w-2xl mx-auto border rounded-lg p-6 bg-background">
            <h2 className="text-xl font-semibold mb-1">{name || "Untitled Form"}</h2>
            {description && (
              <p className="text-muted-foreground mb-4">{description}</p>
            )}
            <FormRenderer
              fields={fields}
              submitLabel={settings.submitButtonLabel}
              onSubmit={async () => {}}
              preview
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Palette + Field List */}
            <div className="space-y-4">
              <FieldPalette />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Form Fields ({fields.length})
                </h4>
                <FieldList
                  fields={fields}
                  selectedFieldId={selectedFieldId}
                  onSelectField={(id) => setSelectedFieldId(id)}
                  onDeleteField={deleteField}
                />
              </div>
            </div>

            {/* Right: Config panel or preview */}
            <div>
              {selectedField ? (
                <FieldConfig
                  field={selectedField}
                  allFields={fields}
                  onChange={updateField}
                  onClose={() => setSelectedFieldId(null)}
                />
              ) : (
                <div className="border rounded-lg p-6 bg-background">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4">
                    Live Preview
                  </h4>
                  <FormRenderer
                    fields={fields}
                    submitLabel={settings.submitButtonLabel}
                    onSubmit={async () => {}}
                    preview
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Settings drawer */}
      <FormSettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onChange={setSettings}
      />

      {/* Drag overlay (visual feedback while dragging) */}
      <DragOverlay>
        {activeDragId ? (
          <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-lg opacity-80">
            Dragging...
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

**Step 2: Create barrel export**

Create `src/components/admin/form-builder/index.ts`:

```typescript
export { FormBuilder } from "./form-builder";
```

**Step 3: Commit**

```bash
git add src/components/admin/form-builder/
git commit -m "feat: add main FormBuilder component with DnD, preview, and save"
```

---

## Task 14: Admin Forms List Page

**Files:**
- Create: `src/app/(dashboard)/admin/forms/page.tsx`

**Step 1: Create the forms list page**

Create `src/app/(dashboard)/admin/forms/page.tsx`:

```tsx
import { requireAdmin } from "@/lib/auth";
import { getForms, deleteForm } from "@/actions/admin/forms";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Inbox, Globe, Lock } from "lucide-react";
import { DeleteFormButton } from "@/components/admin/delete-form-button";

export default async function AdminFormsPage() {
  await requireAdmin();
  const result = await getForms();

  if (!result.success) {
    return <p className="text-destructive">Error: {result.error}</p>;
  }

  const forms = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Forms</h1>
          <p className="text-muted-foreground">Create and manage dynamic forms</p>
        </div>
        <Button asChild>
          <Link href="/admin/forms/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Create Form
          </Link>
        </Button>
      </div>

      {forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No forms yet</h3>
          <p className="text-muted-foreground mb-4">Create your first form to get started</p>
          <Button asChild>
            <Link href="/admin/forms/new">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Form
            </Link>
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Submissions</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.map((form) => (
              <TableRow key={form.id}>
                <TableCell className="font-medium">{form.name}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">
                  /{form.slug}
                </TableCell>
                <TableCell>
                  {form.isPublic ? (
                    <Badge variant="outline" className="gap-1">
                      <Globe className="h-3 w-3" />
                      Public
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="h-3 w-3" />
                      Private
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={form.isActive ? "default" : "secondary"}>
                    {form.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{form._count.submissions}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href={`/admin/forms/${form.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <DeleteFormButton formId={form.id} formName={form.name} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

**Step 2: Create the delete form button (client component)**

Create `src/components/admin/delete-form-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteForm } from "@/actions/admin/forms";

interface DeleteFormButtonProps {
  formId: string;
  formName: string;
}

export function DeleteFormButton({ formId, formName }: DeleteFormButtonProps) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteForm(formId);
    setDeleting(false);

    if (result.success) {
      toast.success("Form deleted");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{formName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the form and all its submissions. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/admin/forms/page.tsx src/components/admin/delete-form-button.tsx
git commit -m "feat: add admin forms list page with create, edit, and delete"
```

---

## Task 15: Admin Form Builder Page (New + Edit)

**Files:**
- Create: `src/app/(dashboard)/admin/forms/new/page.tsx`
- Create: `src/app/(dashboard)/admin/forms/[id]/page.tsx`

**Step 1: Create the new form page**

Create `src/app/(dashboard)/admin/forms/new/page.tsx`:

```tsx
import { requireAdmin } from "@/lib/auth";
import { FormBuilder } from "@/components/admin/form-builder";

export default async function NewFormPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Form</h1>
        <p className="text-muted-foreground">Design a new form with the drag-and-drop builder</p>
      </div>
      <FormBuilder />
    </div>
  );
}
```

**Step 2: Create the edit form page**

Create `src/app/(dashboard)/admin/forms/[id]/page.tsx`:

```tsx
import { requireAdmin } from "@/lib/auth";
import { getForm } from "@/actions/admin/forms";
import { FormBuilder } from "@/components/admin/form-builder";
import { notFound } from "next/navigation";

interface EditFormPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFormPage({ params }: EditFormPageProps) {
  await requireAdmin();
  const { id } = await params;
  const result = await getForm(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Form</h1>
        <p className="text-muted-foreground">Modify your form fields and settings</p>
      </div>
      <FormBuilder form={result.data} />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/admin/forms/
git commit -m "feat: add new and edit form builder pages"
```

---

## Task 16: Admin Submissions Page

**Files:**
- Create: `src/app/(dashboard)/admin/forms/[id]/submissions/page.tsx`
- Create: `src/components/admin/submissions-table.tsx`

**Step 1: Create the submissions table component**

Create `src/components/admin/submissions-table.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Archive, Trash2, Download, Loader2 } from "lucide-react";
import { updateSubmissionStatus, deleteSubmissions, exportSubmissionsCsv } from "@/actions/admin/submissions";
import type { FormSubmission, SubmissionStatus } from "@prisma/client";
import type { FormField } from "@/types/forms";

interface SubmissionsTableProps {
  submissions: FormSubmission[];
  fields: FormField[];
  formId: string;
  total: number;
}

const STATUS_COLORS: Record<SubmissionStatus, "default" | "secondary" | "outline"> = {
  NEW: "default",
  READ: "secondary",
  ARCHIVED: "outline",
};

export function SubmissionsTable({ submissions, fields, formId, total }: SubmissionsTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewSubmission, setViewSubmission] = useState<FormSubmission | null>(null);
  const [acting, setActing] = useState(false);

  // Get first 3 non-layout fields for column preview
  const previewFields = fields
    .filter((f) => !f.type.match(/^(heading|divider)$/))
    .slice(0, 3);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === submissions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(submissions.map((s) => s.id)));
    }
  };

  const handleBulkAction = async (action: "READ" | "ARCHIVED" | "delete") => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    setActing(true);
    try {
      if (action === "delete") {
        const result = await deleteSubmissions(ids);
        if (result.success) toast.success(`Deleted ${result.data} submission(s)`);
        else toast.error(result.error);
      } else {
        const result = await updateSubmissionStatus(ids, action);
        if (result.success) toast.success(`Updated ${result.data} submission(s)`);
        else toast.error(result.error);
      }
      setSelected(new Set());
      router.refresh();
    } finally {
      setActing(false);
    }
  };

  const handleExport = async () => {
    setActing(true);
    try {
      const result = await exportSubmissionsCsv(formId);
      if (result.success) {
        const blob = new Blob([result.data], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `submissions-${formId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV exported");
      } else {
        toast.error(result.error);
      }
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} total submissions</p>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">{selected.size} selected</span>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction("READ")} disabled={acting}>
                Mark Read
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction("ARCHIVED")} disabled={acting}>
                <Archive className="h-3.5 w-3.5 mr-1" />
                Archive
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction("delete")} disabled={acting}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={acting}>
            {acting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
            Export CSV
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={selected.size === submissions.length && submissions.length > 0}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            {previewFields.map((f) => (
              <TableHead key={f.id}>{f.label}</TableHead>
            ))}
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4 + previewFields.length} className="text-center text-muted-foreground py-8">
                No submissions yet
              </TableCell>
            </TableRow>
          ) : (
            submissions.map((sub) => {
              const data = sub.data as Record<string, unknown>;
              return (
                <TableRow key={sub.id} className={sub.status === "NEW" ? "font-medium" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(sub.id)}
                      onCheckedChange={() => toggleSelect(sub.id)}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(sub.createdAt), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLORS[sub.status]}>{sub.status}</Badge>
                  </TableCell>
                  {previewFields.map((f) => (
                    <TableCell key={f.id} className="max-w-[200px] truncate">
                      {Array.isArray(data[f.id])
                        ? (data[f.id] as string[]).join(", ")
                        : String(data[f.id] || "—")}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setViewSubmission(sub)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Submission detail dialog */}
      <Dialog open={!!viewSubmission} onOpenChange={() => setViewSubmission(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Detail</DialogTitle>
          </DialogHeader>
          {viewSubmission && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {format(new Date(viewSubmission.createdAt), "MMMM d, yyyy 'at' h:mm a")}
              </p>
              {fields
                .filter((f) => !f.type.match(/^(heading|divider)$/))
                .map((f) => {
                  const val = (viewSubmission.data as Record<string, unknown>)[f.id];
                  return (
                    <div key={f.id}>
                      <p className="text-sm font-medium">{f.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {Array.isArray(val) ? val.join(", ") : String(val || "—")}
                      </p>
                    </div>
                  );
                })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**Step 2: Create the submissions page**

Create `src/app/(dashboard)/admin/forms/[id]/submissions/page.tsx`:

```tsx
import { requireAdmin } from "@/lib/auth";
import { getForm } from "@/actions/admin/forms";
import { getSubmissions } from "@/actions/admin/submissions";
import { SubmissionsTable } from "@/components/admin/submissions-table";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { FormField } from "@/types/forms";

interface SubmissionsPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubmissionsPage({ params }: SubmissionsPageProps) {
  await requireAdmin();
  const { id } = await params;

  const [formResult, subsResult] = await Promise.all([
    getForm(id),
    getSubmissions(id),
  ]);

  if (!formResult.success || !formResult.data) notFound();
  if (!subsResult.success) {
    return <p className="text-destructive">Error: {subsResult.error}</p>;
  }

  const form = formResult.data;
  const fields = form.fields as unknown as FormField[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/forms/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{form.name} — Submissions</h1>
          <p className="text-muted-foreground">View and manage form responses</p>
        </div>
      </div>

      <SubmissionsTable
        submissions={subsResult.data.submissions}
        fields={fields}
        formId={id}
        total={subsResult.data.total}
      />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/admin/forms/[id]/submissions/ src/components/admin/submissions-table.tsx
git commit -m "feat: add admin submissions page with table, detail view, and CSV export"
```

---

## Task 17: Add Forms to Admin Sidebar Navigation

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

**Step 1: Add Forms link to the staff/admin nav**

In `src/components/layout/app-sidebar.tsx`, find the staff nav items (look for the section with "Services" link) and add a "Forms" item after it:

```typescript
// Add FileText to the lucide-react import
import { ..., FileText } from "lucide-react";
```

Add to the staff nav items array, after the Services item:

```typescript
{ title: "Forms", url: "/admin/forms", icon: FileText },
```

**Step 2: Verify it renders correctly**

Run: `npm run dev`
Navigate to the admin sidebar and verify "Forms" appears.

**Step 3: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat: add Forms link to admin sidebar navigation"
```

---

## Task 18: Service CTA Integration — Update UpsellSection

**Files:**
- Modify: `src/components/dashboard/upsell-section.tsx`
- Modify: `src/actions/dashboard.ts`

**Step 1: Update dashboard action to include form data on services**

In `src/actions/dashboard.ts`, update the upsell services query to include the linked form:

```typescript
const upsellServices = await prisma.recommendedService.findMany({
  where: {
    isActive: true,
    type: { notIn: clientServiceTypes },
  },
  include: {
    form: {
      select: { id: true, name: true, fields: true, settings: true, isActive: true },
    },
  },
  orderBy: { sortOrder: "asc" },
});
```

**Step 2: Update the UpsellSection component**

In `src/components/dashboard/upsell-section.tsx`:

1. Import the FormRenderer and the submitForm action
2. Add Dialog for form modal
3. When a service has a `formId` and linked form, clicking the CTA opens the form in a dialog instead of navigating away
4. Pre-fill client data (name, email, website) and the service name
5. On submit, call `submitForm()` and show success message

The component should:
- Keep backward compatibility: if `formId` is null, use existing ctaUrl behavior
- If `formId` is set and form exists + is active, open modal with FormRenderer
- Pass prefill data: `{ name: clientName, email: clientEmail, website: clientWebsite, serviceName: service.title }`

**Step 3: Update admin service dialog to allow selecting a form**

In `src/components/admin/service-dialog.tsx`, add a form selector dropdown that shows available forms. When a form is selected, set `formId` on the service. Keep `ctaUrl` as fallback.

In `src/actions/admin/services.ts`, update create/update to handle the `formId` field.

In `src/lib/validations.ts`, add `formId: z.string().optional()` to `serviceFormSchema`.

**Step 4: Commit**

```bash
git add src/components/dashboard/upsell-section.tsx src/actions/dashboard.ts src/components/admin/service-dialog.tsx src/actions/admin/services.ts src/lib/validations.ts
git commit -m "feat: integrate forms with service CTAs — modal form on CTA click"
```

---

## Task 19: Public Form Pages

**Files:**
- Create: `src/app/forms/[slug]/page.tsx`
- Modify: `src/middleware.ts` (add public route)

**Step 1: Add /forms route to public routes in middleware**

In `src/middleware.ts`, add to `isPublicRoute`:

```typescript
"/forms/(.*)",
```

**Step 2: Create the public form page**

Create `src/app/forms/[slug]/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import type { FormField, FormSettings, FormPrefillData } from "@/types/forms";
import { PublicFormPage } from "@/components/forms/public-form-page";
import { BRAND } from "@/lib/constants";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const form = await prisma.form.findUnique({ where: { slug } });
  return {
    title: form ? `${form.name} — ${BRAND.name}` : "Form Not Found",
    description: form?.description || undefined,
  };
}

export default async function PublicForm({ params }: PageProps) {
  const { slug } = await params;

  const form = await prisma.form.findUnique({ where: { slug } });
  if (!form || !form.isActive || !form.isPublic) {
    notFound();
  }

  // Try to get client data for prefill (non-blocking — OK if not logged in)
  let prefill: FormPrefillData = {};
  try {
    const user = await getAuthUser();
    if (user) {
      const client = await prisma.client.findFirst({
        where: { clerkUserId: user.clerkUserId },
      });
      if (client) {
        prefill = {
          name: client.name,
          email: client.email,
          website: client.websiteUrl || undefined,
        };
      }
    }
  } catch {
    // Not logged in — that's fine for public forms
  }

  const fields = form.fields as unknown as FormField[];
  const settings = form.settings as unknown as FormSettings;

  return (
    <PublicFormPage
      form={{
        id: form.id,
        name: form.name,
        description: form.description,
        fields,
        settings,
      }}
      prefill={prefill}
    />
  );
}
```

**Step 3: Create the PublicFormPage client component**

Create `src/components/forms/public-form-page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FormRenderer } from "./form-renderer";
import { submitForm } from "@/actions/forms";
import { CheckCircle2 } from "lucide-react";
import type { FormField, FormSettings, FormPrefillData } from "@/types/forms";

interface PublicFormPageProps {
  form: {
    id: string;
    name: string;
    description: string | null;
    fields: FormField[];
    settings: FormSettings;
  };
  prefill: FormPrefillData;
}

export function PublicFormPage({ form, prefill }: PublicFormPageProps) {
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (data: Record<string, string | string[]>) => {
    const result = await submitForm(form.id, data);
    if (result.success) {
      if (form.settings.redirectUrl) {
        window.location.href = form.settings.redirectUrl;
        return;
      }
      setSuccessMessage(result.data.message);
      setSubmitted(true);
    } else {
      toast.error(result.error);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">{successMessage}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="max-w-2xl w-full">
        <div className="rounded-lg border bg-background p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{form.name}</h1>
            {form.description && (
              <p className="text-muted-foreground mt-1">{form.description}</p>
            )}
          </div>
          <FormRenderer
            fields={form.fields}
            prefill={prefill}
            submitLabel={form.settings.submitButtonLabel}
            onSubmit={handleSubmit}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by APM | UC Support
        </p>
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/app/forms/ src/components/forms/public-form-page.tsx src/middleware.ts
git commit -m "feat: add public form pages at /forms/[slug] with optional client prefill"
```

---

## Task 20: Update Service Dialog to Support Form Selection

**Files:**
- Modify: `src/components/admin/service-dialog.tsx`
- Modify: `src/actions/admin/services.ts`
- Modify: `src/lib/validations.ts`

**Step 1: Add formId to service validation schema**

In `src/lib/validations.ts`, update `serviceFormSchema` to add:

```typescript
formId: z.string().nullable().optional(),
```

**Step 2: Update service actions to handle formId**

In `src/actions/admin/services.ts`, add `formId` to the create and update data objects:

```typescript
formId: parsed.data.formId || null,
```

**Step 3: Update service dialog with form selector**

In `src/components/admin/service-dialog.tsx`:
- Accept a `forms` prop (list of available forms from `getForms()`)
- Add a select dropdown: "Link to Form" with options of available active forms + "None"
- When a form is selected, show a note that the CTA will open the form in a modal
- Keep ctaUrl field as fallback (show it only when no form is selected)

**Step 4: Update admin services page to pass forms**

In `src/app/(dashboard)/admin/services/page.tsx`, fetch forms and pass them to the dialog.

**Step 5: Commit**

```bash
git add src/components/admin/service-dialog.tsx src/actions/admin/services.ts src/lib/validations.ts src/app/(dashboard)/admin/services/page.tsx
git commit -m "feat: add form selector to service dialog for CTA integration"
```

---

## Task 21: Verification & Manual Testing

**Step 1: Run production build to verify no type errors**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 2: Start dev server and test form builder**

Run: `npm run dev`

Test checklist:
- [ ] Navigate to `/admin/forms` — page loads, empty state shows
- [ ] Click "Create Form" — builder loads with empty state
- [ ] Drag fields from palette — they appear in field list
- [ ] Reorder fields by dragging — order updates
- [ ] Click a field — configuration panel shows
- [ ] Edit field label, placeholder, required, width — changes stick
- [ ] Add options to a select field — options editor works
- [ ] Toggle Preview mode — live preview renders the form
- [ ] Fill in form name, slug, toggle Active/Public
- [ ] Open Settings panel — all settings editable
- [ ] Save form — redirects to edit page, toast confirms
- [ ] Navigate to `/admin/forms` — new form appears in table

**Step 3: Test form submission**

- [ ] Navigate to `/forms/[slug]` (if public) — form renders
- [ ] Fill in fields and submit — success message shows
- [ ] Check `/admin/forms/[id]/submissions` — submission appears
- [ ] Click to view submission detail — all data shown
- [ ] Export CSV — file downloads

**Step 4: Test service CTA integration**

- [ ] Edit a service in `/admin/services` — form selector shows
- [ ] Link a form to a service — saves successfully
- [ ] View dashboard as client — CTA opens form in modal
- [ ] Submit form — success message, modal closes

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```

---

## Task 22: Seed Data — Default Support Request Form (optional)

**Files:**
- Modify: `prisma/seed.ts` (if exists) or create seed script

**Step 1: Create a seed for the default support form**

This is optional and can be done later when migrating the support form to use the forms module. The support form migration (converting `/support/new` to use FormRenderer with `settings.type = "helpscout"`) is a separate follow-up task since it changes existing functionality.

**Step 2: Document the migration path**

The support form migration involves:
1. Creating a "Support Request" form in admin with fields matching current support form
2. Setting `settings.type = "helpscout"`
3. Updating `/support/new` to load and render this form via FormRenderer
4. Keeping file attachment support (would need a file upload field type — future enhancement)

---

## Summary of New Files

```
src/types/forms.ts                                    — Form type definitions
src/lib/email.ts                                       — Nodemailer utility
src/lib/validations.ts                                 — Updated with form schemas
src/actions/admin/forms.ts                             — Form CRUD actions
src/actions/admin/submissions.ts                       — Submission management actions
src/actions/forms.ts                                   — Form submission action
src/components/forms/form-renderer.tsx                 — Shared form renderer
src/components/forms/public-form-page.tsx              — Public form wrapper
src/components/admin/form-builder/field-palette.tsx    — DnD field type palette
src/components/admin/form-builder/sortable-field.tsx   — Sortable field card
src/components/admin/form-builder/field-list.tsx       — Sortable field list
src/components/admin/form-builder/field-config.tsx     — Field configuration panel
src/components/admin/form-builder/form-settings-panel.tsx — Form settings drawer
src/components/admin/form-builder/form-builder.tsx     — Main builder component
src/components/admin/form-builder/index.ts             — Barrel export
src/components/admin/delete-form-button.tsx            — Delete confirmation button
src/components/admin/submissions-table.tsx             — Submissions table
src/app/(dashboard)/admin/forms/page.tsx               — Forms list page
src/app/(dashboard)/admin/forms/new/page.tsx           — New form page
src/app/(dashboard)/admin/forms/[id]/page.tsx          — Edit form page
src/app/(dashboard)/admin/forms/[id]/submissions/page.tsx — Submissions page
src/app/forms/[slug]/page.tsx                          — Public form page
```

## Modified Files

```
prisma/schema.prisma                                   — New models + formId on RecommendedService
package.json                                           — @dnd-kit + nodemailer deps
src/types/index.ts                                     — Re-export forms types
src/lib/validations.ts                                 — Form + service schemas
src/middleware.ts                                       — Public /forms route
src/components/layout/app-sidebar.tsx                  — Forms nav link
src/components/dashboard/upsell-section.tsx            — Form modal for CTAs
src/actions/dashboard.ts                               — Include form on services
src/components/admin/service-dialog.tsx                — Form selector
src/actions/admin/services.ts                          — Handle formId
```
