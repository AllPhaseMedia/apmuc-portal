import "server-only";

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";

/** Get a single SMTP setting: DB first, then env fallback */
async function getSetting(key: string, envKey: string, fallback = ""): Promise<string> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key } });
    if (row?.value) return row.value;
  } catch {
    // Table might not exist yet — fall through to env
  }
  return process.env[envKey] ?? fallback;
}

/** Build a fresh nodemailer transporter from DB/env settings */
export async function getSmtpTransporter(): Promise<Transporter | null> {
  const host = await getSetting("smtpHost", "SMTP_HOST");
  const user = await getSetting("smtpUser", "SMTP_USER");
  const pass = await getSetting("smtpPass", "SMTP_PASS");

  if (!host || !user || !pass) return null;

  const port = Number(await getSetting("smtpPort", "SMTP_PORT", "587"));
  const secure = (await getSetting("smtpSecure", "SMTP_SECURE", "false")) === "true";

  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

export async function isEmailConfigured(): Promise<boolean> {
  const transporter = await getSmtpTransporter();
  return transporter !== null;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  const transporter = await getSmtpTransporter();
  if (!transporter) {
    console.warn("[email] SMTP not configured, skipping email send");
    return;
  }

  const from = await getSetting("smtpFrom", "SMTP_FROM", "noreply@clientsupport.app");

  await transporter.sendMail({
    from,
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
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;vertical-align:top;white-space:nowrap;">${f.label}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${f.value || "<em>&mdash;</em>"}</td></tr>`
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
