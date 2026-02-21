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
