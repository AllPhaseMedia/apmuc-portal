"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  getHeaderSettings,
  saveHeaderLinks,
} from "@/actions/admin/branding";
import type { HeaderLink } from "@/types/branding";

const DEFAULT_LINKS: HeaderLink[] = [
  { id: "default-submit", label: "Submit a Request", href: "/forms/support-request", order: 0 },
  { id: "default-signin", label: "Sign In", href: "/sign-in", order: 1 },
];

export function HeaderTab() {
  const [links, setLinks] = useState<HeaderLink[]>(DEFAULT_LINKS);
  const [loading, setLoading] = useState(true);
  const [savingLinks, setSavingLinks] = useState(false);

  useEffect(() => {
    getHeaderSettings().then((result) => {
      if (result.success && result.data.links.length > 0) {
        setLinks(result.data.links);
      }
      setLoading(false);
    });
  }, []);

  const addLink = () => {
    setLinks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: "",
        href: "",
        order: prev.length,
      },
    ]);
  };

  const updateLink = (id: string, field: "label" | "href", value: string) => {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const removeLink = (id: string) => {
    setLinks((prev) =>
      prev
        .filter((l) => l.id !== id)
        .map((l, i) => ({ ...l, order: i }))
    );
  };

  async function handleSaveLinks() {
    setSavingLinks(true);
    const result = await saveHeaderLinks(links);
    if (result.success) toast.success(result.data.message);
    else toast.error(result.error);
    setSavingLinks(false);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading header settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Navigation Links</CardTitle>
          <CardDescription>
            Links displayed in the public header navigation bar. The last link
            is styled as a primary button.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {links.map((link) => (
            <div key={link.id} className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label>Label</Label>
                <Input
                  value={link.label}
                  onChange={(e) => updateLink(link.id, "label", e.target.value)}
                  placeholder="Submit a Request"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>URL</Label>
                <Input
                  value={link.href}
                  onChange={(e) => updateLink(link.id, "href", e.target.value)}
                  placeholder="/forms/support-request"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeLink(link.id)}
                className="text-destructive hover:text-destructive mb-0.5"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={addLink}>
              <Plus className="h-4 w-4 mr-1" />
              Add Link
            </Button>
            <Button onClick={handleSaveLinks} disabled={savingLinks} size="sm">
              {savingLinks && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Links
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
