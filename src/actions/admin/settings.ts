"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult } from "@/types";

export type SmtpSettings = {
  smtpHost: string;
  smtpPort: string;
  smtpSecure: string;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
};

const SMTP_KEYS: (keyof SmtpSettings)[] = [
  "smtpHost",
  "smtpPort",
  "smtpSecure",
  "smtpUser",
  "smtpPass",
  "smtpFrom",
];

export async function getSmtpSettings(): Promise<ActionResult<SmtpSettings>> {
  try {
    await requireAdmin();

    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: SMTP_KEYS } },
    });

    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    // DB values override env, env is the fallback
    return {
      success: true,
      data: {
        smtpHost: map.smtpHost ?? process.env.SMTP_HOST ?? "",
        smtpPort: map.smtpPort ?? process.env.SMTP_PORT ?? "587",
        smtpSecure: map.smtpSecure ?? process.env.SMTP_SECURE ?? "false",
        smtpUser: map.smtpUser ?? process.env.SMTP_USER ?? "",
        smtpPass: map.smtpPass ?? process.env.SMTP_PASS ?? "",
        smtpFrom: map.smtpFrom ?? process.env.SMTP_FROM ?? "",
      },
    };
  } catch (error) {
    console.error("[settings] getSmtpSettings error:", error);
    return { success: false, error: "Failed to load settings" };
  }
}

export async function saveSmtpSettings(
  settings: SmtpSettings
): Promise<ActionResult<{ message: string }>> {
  try {
    await requireAdmin();

    for (const key of SMTP_KEYS) {
      await prisma.systemSetting.upsert({
        where: { key },
        create: { key, value: settings[key] },
        update: { value: settings[key] },
      });
    }

    return { success: true, data: { message: "SMTP settings saved" } };
  } catch (error) {
    console.error("[settings] saveSmtpSettings error:", error);
    return { success: false, error: "Failed to save settings" };
  }
}

export async function testSmtpConnection(
  to: string
): Promise<ActionResult<{ message: string }>> {
  try {
    await requireAdmin();

    // Dynamic import to get fresh settings
    const { getSmtpTransporter } = await import("@/lib/email");
    const transporter = await getSmtpTransporter();

    if (!transporter) {
      return { success: false, error: "SMTP not configured" };
    }

    await transporter.sendMail({
      from: (await getSmtpSetting("smtpFrom")) || "noreply@clientsupport.app",
      to,
      subject: "SMTP Test — APM | UC Support",
      html: "<p>If you received this email, your SMTP settings are working correctly.</p>",
    });

    return { success: true, data: { message: `Test email sent to ${to}` } };
  } catch (error) {
    console.error("[settings] testSmtp error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMTP test failed",
    };
  }
}

/** Helper: get a single setting value (DB first, then env fallback) */
export async function getSmtpSetting(key: keyof SmtpSettings): Promise<string> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  if (row?.value) return row.value;

  const envMap: Record<string, string | undefined> = {
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpSecure: process.env.SMTP_SECURE,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpFrom: process.env.SMTP_FROM,
  };

  return envMap[key] ?? "";
}
