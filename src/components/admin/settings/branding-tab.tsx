"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Paintbrush } from "lucide-react";
import { ColorPickerField } from "./color-picker-field";
import { LogoUploadField } from "./logo-upload-field";
import {
  getBrandingSettings,
  saveBrandingSettings,
} from "@/actions/admin/branding";
import type { BrandingSettings } from "@/types/branding";

export function BrandingTab() {
  const [settings, setSettings] = useState<Partial<BrandingSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBrandingSettings().then((result) => {
      if (result.success) {
        setSettings(result.data);
      }
      setLoading(false);
    });
  }, []);

  const update = (key: keyof BrandingSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  async function handleSave() {
    setSaving(true);
    const result = await saveBrandingSettings(settings);
    if (result.success) {
      toast.success(result.data.message);
    } else {
      toast.error(result.error);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading branding settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5" />
            <CardTitle>Brand Identity</CardTitle>
          </div>
          <CardDescription>
            Configure your portal name, description, and company info.
            Leave fields blank to use defaults.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Portal Name</Label>
              <Input
                value={settings.name ?? ""}
                onChange={(e) => update("name", e.target.value)}
                placeholder="APM | UC Support"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                value={settings.fullName ?? ""}
                onChange={(e) => update("fullName", e.target.value)}
                placeholder="All Phase Media & UnionCoded"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tagline</Label>
              <Input
                value={settings.tagline ?? ""}
                onChange={(e) => update("tagline", e.target.value)}
                placeholder="Client Support Portal"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Portal URL</Label>
              <Input
                value={settings.url ?? ""}
                onChange={(e) => update("url", e.target.value)}
                placeholder="https://clientsupport.app"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={settings.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Manage your website, support requests, and billing in one place."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input
                value={settings.companyName ?? ""}
                onChange={(e) => update("companyName", e.target.value)}
                placeholder="All Phase Media"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company Location</Label>
              <Input
                value={settings.companyLocation ?? ""}
                onChange={(e) => update("companyLocation", e.target.value)}
                placeholder="Long Island, NY"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Colors</CardTitle>
          <CardDescription>
            Override theme colors. Leave blank to use defaults.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 sm:grid-cols-2">
            <ColorPickerField
              label="Primary / Accent Color"
              value={settings.colorPrimary ?? ""}
              onChange={(v) => update("colorPrimary", v)}
              defaultValue="oklch(0.705 0.213 47.604)"
            />
            <ColorPickerField
              label="Sidebar Background Color"
              value={settings.colorSidebar ?? ""}
              onChange={(v) => update("colorSidebar", v)}
              defaultValue="oklch(0.17 0.04 260)"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logos</CardTitle>
          <CardDescription>
            Upload logos for light and dark themes. PNG, SVG, or WebP, max 500KB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 sm:grid-cols-2">
            <LogoUploadField
              label="Logo (Light Theme)"
              value={settings.logoLight ?? ""}
              onChange={(v) => update("logoLight", v)}
            />
            <LogoUploadField
              label="Logo (Dark Theme)"
              value={settings.logoDark ?? ""}
              onChange={(v) => update("logoDark", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Branding
      </Button>
    </div>
  );
}
