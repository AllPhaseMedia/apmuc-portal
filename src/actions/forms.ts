"use server";

import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { sendEmail, buildSubmissionEmail, isEmailConfigured } from "@/lib/email";
import { createConversation } from "@/lib/helpscout";
import type { ActionResult } from "@/types";
import type { Attachment } from "@/lib/helpscout";
import type { FormField, FormSettings } from "@/types/forms";
import { getBranding } from "@/lib/branding";

const submitFormSchema = z.object({
  formId: z.string().uuid(),
  data: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
});

export async function submitForm(
  formId: string,
  data: Record<string, string | string[]>
): Promise<ActionResult<{ message: string }>> {
  try {
    const parsed = submitFormSchema.safeParse({ formId, data });
    if (!parsed.success) {
      return { success: false, error: "Invalid form data" };
    }

    const form = await prisma.form.findUnique({ where: { id: parsed.data.formId } });
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
      clientEmail = user.email;
      const contact = await prisma.clientContact.findFirst({
        where: { clerkUserId: user.clerkUserId, isActive: true },
        select: { clientId: true },
      });
      if (contact) {
        clientId = contact.clientId;
      }
    }

    // Extract file attachments from file fields
    const fileFields = fields.filter((f) => f.type === "file");
    const allAttachments: Attachment[] = [];
    for (const ff of fileFields) {
      const raw = data[ff.id];
      if (typeof raw === "string" && raw.startsWith("[")) {
        try {
          const parsed = JSON.parse(raw) as Attachment[];
          allAttachments.push(...parsed);
        } catch {
          // ignore parse errors
        }
      }
    }

    // Build field label/value pairs for email (exclude file fields)
    const labeledFields = fields
      .filter((f) => !f.type.match(/^(heading|divider|file|html)$/))
      .map((f) => ({
        label: f.label,
        value: Array.isArray(data[f.id]) ? (data[f.id] as string[]).join(", ") : (data[f.id] as string) || "",
      }));

    // Handle Help Scout type
    if (settings.type === "helpscout") {
      // Find email field: prefer prefillKey match, fall back to type === "email"
      const emailField =
        fields.find((f) => f.prefillKey === "email") ||
        fields.find((f) => f.type === "email");
      const emailValue = emailField ? (data[emailField.id] as string) : "";

      // Find name field: prefer prefillKey match, fall back to type === "text" with "name" in label
      const nameField =
        fields.find((f) => f.prefillKey === "name") ||
        fields.find((f) => f.type === "text" && f.label.toLowerCase().includes("name"));
      const nameValue = nameField ? (data[nameField.id] as string) : "";

      const bodyHtml = labeledFields
        .map((f) => `<p><strong>${f.label}:</strong> ${f.value}</p>`)
        .join("");

      // Always use form-submitted email over client record
      const subject = settings.subject?.trim() || `[${form.name}] New Submission`;
      await createConversation(
        emailValue || clientEmail || "unknown@unknown.com",
        nameValue || "Portal User",
        subject,
        bodyHtml,
        allAttachments.length > 0 ? allAttachments : undefined
      );
    }

    // Store in DB — strip base64 data from file fields, keep only metadata
    const dbData = { ...data };
    for (const ff of fileFields) {
      const raw = dbData[ff.id];
      if (typeof raw === "string" && raw.startsWith("[")) {
        try {
          const parsed = JSON.parse(raw) as Attachment[];
          dbData[ff.id] = JSON.stringify(
            parsed.map(({ fileName, mimeType }) => ({ fileName, mimeType }))
          );
        } catch {
          // keep as-is
        }
      }
    }

    if (settings.storeSubmissions) {
      await prisma.formSubmission.create({
        data: {
          formId,
          data: JSON.parse(JSON.stringify(dbData)),
          metadata: {
            clientId: clientId || null,
            email: clientEmail || null,
          },
        },
      });
    }

    // Send email notification
    if (settings.emailNotification && settings.emailTo && await isEmailConfigured()) {
      const branding = await getBranding();
      const adminUrl = `${branding.url}/admin/forms/${formId}/submissions`;
      const html = buildSubmissionEmail({
        formName: form.name,
        fields: labeledFields,
        submittedAt: new Date(),
        adminUrl,
      });

      const emailSubject = settings.subject?.trim() || `New submission: ${form.name}`;
      await sendEmail({
        to: settings.emailTo,
        subject: emailSubject,
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
        console.warn(`[forms] Webhook failed for form ${formId}`);
      }
    }

    return { success: true, data: { message: settings.successMessage } };
  } catch (error) {
    console.error("[forms] Submit error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Submission failed" };
  }
}
