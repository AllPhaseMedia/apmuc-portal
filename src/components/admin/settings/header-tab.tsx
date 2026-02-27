"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  getHeaderSettings,
  saveHeaderLinks,
  getClientNavLinks,
  saveClientNavLinks,
} from "@/actions/admin/branding";
import type { HeaderLink, ClientNavLink } from "@/types/branding";

const DEFAULT_LINKS: HeaderLink[] = [
  { id: "default-submit", label: "Submit a Request", href: "/forms/support-request", order: 0 },
  { id: "default-signin", label: "Sign In", href: "/sign-in", order: 1 },
];

export function HeaderTab() {
  const [links, setLinks] = useState<HeaderLink[]>(DEFAULT_LINKS);
  const [clientLinks, setClientLinks] = useState<ClientNavLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingLinks, setSavingLinks] = useState(false);
  const [savingClientLinks, setSavingClientLinks] = useState(false);

  useEffect(() => {
    Promise.all([getHeaderSettings(), getClientNavLinks()]).then(
      ([headerResult, clientResult]) => {
        if (headerResult.success && headerResult.data.links.length > 0) {
          setLinks(headerResult.data.links);
        }
        if (clientResult.success) {
          setClientLinks(clientResult.data.links);
        }
        setLoading(false);
      }
    );
  }, []);

  // ── Header Links ──

  const addLink = () => {
    setLinks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "", href: "", order: prev.length },
    ]);
  };

  const updateLink = (id: string, field: "label" | "href", value: string) => {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const removeLink = (id: string) => {
    setLinks((prev) =>
      prev.filter((l) => l.id !== id).map((l, i) => ({ ...l, order: i }))
    );
  };

  async function handleSaveLinks() {
    setSavingLinks(true);
    const result = await saveHeaderLinks(links);
    if (result.success) toast.success(result.data.message);
    else toast.error(result.error);
    setSavingLinks(false);
  }

  // ── Client Sidebar Links ──

  const addClientLink = () => {
    setClientLinks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: "",
        href: "",
        openInNewTab: false,
        order: prev.length,
      },
    ]);
  };

  const updateClientLink = (
    id: string,
    field: "label" | "href" | "openInNewTab",
    value: string | boolean
  ) => {
    setClientLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const removeClientLink = (id: string) => {
    setClientLinks((prev) =>
      prev.filter((l) => l.id !== id).map((l, i) => ({ ...l, order: i }))
    );
  };

  async function handleSaveClientLinks() {
    setSavingClientLinks(true);
    const result = await saveClientNavLinks(clientLinks);
    if (result.success) toast.success(result.data.message);
    else toast.error(result.error);
    setSavingClientLinks(false);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading navigation settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Links */}
      <Card>
        <CardHeader>
          <CardTitle>Header Navigation Links</CardTitle>
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
              {savingLinks && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Links
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Client Sidebar Links */}
      <Card>
        <CardHeader>
          <CardTitle>Client Sidebar Links</CardTitle>
          <CardDescription>
            Custom links shown in the sidebar for logged-in clients. Use for
            external links (e.g. Google Reviews) or internal pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {clientLinks.map((link) => (
            <div key={link.id} className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label>Label</Label>
                <Input
                  value={link.label}
                  onChange={(e) =>
                    updateClientLink(link.id, "label", e.target.value)
                  }
                  placeholder="Leave a Review"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>URL</Label>
                <Input
                  value={link.href}
                  onChange={(e) =>
                    updateClientLink(link.id, "href", e.target.value)
                  }
                  placeholder="https://g.page/review/..."
                />
              </div>
              <div className="flex items-center gap-2 mb-0.5">
                <Switch
                  checked={link.openInNewTab}
                  onCheckedChange={(checked) =>
                    updateClientLink(link.id, "openInNewTab", checked)
                  }
                />
                <Label className="text-xs whitespace-nowrap">New tab</Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeClientLink(link.id)}
                className="text-destructive hover:text-destructive mb-0.5"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addClientLink}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Link
            </Button>
            <Button
              onClick={handleSaveClientLinks}
              disabled={savingClientLinks}
              size="sm"
            >
              {savingClientLinks && (
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
