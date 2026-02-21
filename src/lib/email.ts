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
