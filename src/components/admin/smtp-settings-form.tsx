"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mail, Send } from "lucide-react";
import { saveSmtpSettings, testSmtpConnection } from "@/actions/admin/settings";
import type { SmtpSettings } from "@/actions/admin/settings";

interface SmtpSettingsFormProps {
  initialSettings?: SmtpSettings;
}

export function SmtpSettingsForm({ initialSettings }: SmtpSettingsFormProps) {
  const [settings, setSettings] = useState<SmtpSettings>(
    initialSettings ?? {
      smtpHost: "",
      smtpPort: "587",
      smtpSecure: "false",
      smtpUser: "",
      smtpPass: "",
      smtpFrom: "",
    }
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const isConfigured = !!(settings.smtpHost && settings.smtpUser && settings.smtpPass);

  async function handleSave() {
    setSaving(true);
    const result = await saveSmtpSettings(settings);
    if (result.success) {
      toast.success(result.data?.message);
    } else {
      toast.error(result.error);
    }
    setSaving(false);
  }

  async function handleTest() {
    if (!testEmail) {
      toast.error("Enter an email address to send the test to");
      return;
    }
    setTesting(true);
    // Save first so the test uses latest settings
    await saveSmtpSettings(settings);
    const result = await testSmtpConnection(testEmail);
    if (result.success) {
      toast.success(result.data?.message);
    } else {
      toast.error(result.error);
    }
    setTesting(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <CardTitle>Email / SMTP Settings</CardTitle>
        </div>
        <CardDescription>
          Configure outgoing email for form submission notifications.
          {!isConfigured && (
            <span className="text-destructive ml-1">
              SMTP is not configured — email notifications are disabled.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>SMTP Host</Label>
            <Input
              value={settings.smtpHost}
              onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
              placeholder="smtp.example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Port</Label>
            <Input
              value={settings.smtpPort}
              onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })}
              placeholder="587"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input
              value={settings.smtpUser}
              onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input
              type="password"
              value={settings.smtpPass}
              onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>From Address</Label>
            <Input
              type="email"
              value={settings.smtpFrom}
              onChange={(e) => setSettings({ ...settings, smtpFrom: e.target.value })}
              placeholder="noreply@example.com"
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch
              checked={settings.smtpSecure === "true"}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, smtpSecure: checked ? "true" : "false" })
              }
            />
            <Label>Use SSL/TLS</Label>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>

        {/* Test email */}
        <div className="border-t pt-4 mt-4">
          <Label className="mb-2 block">Send Test Email</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="max-w-xs"
            />
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing || !isConfigured}
            >
              {testing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Test
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
