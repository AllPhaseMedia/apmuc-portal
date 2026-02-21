"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { RichEditor } from "@/components/admin/rich-editor";
import {
  getFooterSettings,
  saveFooterContent,
  saveFooterLinks,
} from "@/actions/admin/branding";
import type { FooterLink } from "@/types/branding";

export function FooterTab() {
  const [content, setContent] = useState("");
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingContent, setSavingContent] = useState(false);
  const [savingLinks, setSavingLinks] = useState(false);

  useEffect(() => {
    getFooterSettings().then((result) => {
      if (result.success) {
        setContent(result.data.content);
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

  async function handleSaveContent() {
    setSavingContent(true);
    const result = await saveFooterContent(content);
    if (result.success) toast.success(result.data.message);
    else toast.error(result.error);
    setSavingContent(false);
  }

  async function handleSaveLinks() {
    setSavingLinks(true);
    const result = await saveFooterLinks(links);
    if (result.success) toast.success(result.data.message);
    else toast.error(result.error);
    setSavingLinks(false);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading footer settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Footer Content</CardTitle>
          <CardDescription>
            Rich HTML content displayed in the footer area.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RichEditor content={content} onChange={setContent} />
          <Button onClick={handleSaveContent} disabled={savingContent}>
            {savingContent && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Footer Content
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Footer Links</CardTitle>
          <CardDescription>
            Links displayed in a row at the bottom of the page.
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
                  placeholder="Privacy Policy"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>URL</Label>
                <Input
                  value={link.href}
                  onChange={(e) => updateLink(link.id, "href", e.target.value)}
                  placeholder="/privacy"
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
