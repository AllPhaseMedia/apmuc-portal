import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSmtpSettings } from "@/actions/admin/settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandingTab } from "@/components/admin/settings/branding-tab";
import { HomepageTab } from "@/components/admin/settings/homepage-tab";
import { FooterTab } from "@/components/admin/settings/footer-tab";
import { SmtpSettingsForm } from "@/components/admin/smtp-settings-form";
import { SupportFormCard } from "@/components/admin/support-form-card";

export default async function AdminSettingsPage() {
  await requireAdmin();

  const [smtpResult, supportForm] = await Promise.all([
    getSmtpSettings(),
    prisma.form.findFirst({
      where: { slug: "support-request" },
      select: { id: true, isActive: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure portal branding, landing page, and integrations
        </p>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="homepage">Homepage</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <BrandingTab />
        </TabsContent>

        <TabsContent value="homepage">
          <HomepageTab />
        </TabsContent>

        <TabsContent value="footer">
          <FooterTab />
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <SupportFormCard supportForm={supportForm} />
          <SmtpSettingsForm
            initialSettings={smtpResult.success ? smtpResult.data : undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
