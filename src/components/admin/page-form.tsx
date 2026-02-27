"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createPage, updatePage } from "@/actions/admin/pages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichEditor } from "@/components/admin/rich-editor";

type PageData = {
  id: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
};

type Props = {
  page?: PageData;
};

export function PageForm({ page }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [content, setContent] = useState(page?.content ?? "");
  const [isPublished, setIsPublished] = useState(page?.isPublished ?? false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!page);

  // Auto-generate slug from title (only on create, if slug hasn't been manually edited)
  useEffect(() => {
    if (!slugManuallyEdited && !page) {
      const generated = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setSlug(generated);
    }
  }, [title, slugManuallyEdited, page]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const values = { title, slug, content, isPublished };

    if (page) {
      const result = await updatePage(page.id, values);
      if (result.success) {
        toast.success("Page updated");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } else {
      const result = await createPage(values);
      if (result.success) {
        toast.success("Page created");
        router.push("/admin/pages");
      } else {
        toast.error(result.error);
      }
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{page ? "Edit Page" : "New Page"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Page title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManuallyEdited(true);
                }}
                placeholder="page-slug"
                required
              />
              <p className="text-xs text-muted-foreground">
                URL: /pages/{slug || "..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
            <Label htmlFor="published">Published</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent>
          <RichEditor content={content} onChange={setContent} />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          {page ? "Update Page" : "Create Page"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/pages")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
