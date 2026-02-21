import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SmtpSettingsForm } from "@/components/admin/smtp-settings-form";
import { SupportFormCard } from "@/components/admin/support-form-card";
import { getSmtpSettings } from "@/actions/admin/settings";

export default async function AdminSettingsPage() {
  await requireAdmin();

  const smtpResult = await getSmtpSettings();

  // Check if support-request form exists
  const supportForm = await prisma.form.findFirst({
    where: { slug: "support-request" },
    select: { id: true, isActive: true, name: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure portal integrations and system settings
        </p>
      </div>

      <SupportFormCard supportForm={supportForm} />

      <SmtpSettingsForm
        initialSettings={smtpResult.success ? smtpResult.data : undefined}
      />
    </div>
  );
}
