"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { RichEditor } from "@/components/admin/rich-editor";
import { LogoUploadField } from "./logo-upload-field";
import { FeatureBlocksList } from "./feature-blocks-list";
import {
  getHomepageSettings,
  saveHomepageHero,
  saveHomepageContent,
} from "@/actions/admin/branding";
import type { HomepageHero, FeatureBlock } from "@/types/branding";

const DEFAULT_HERO: HomepageHero = {
  title: "How can we help you?",
  description:
    "Submit a support request, manage your billing, or browse our knowledge base.",
  primaryCta: { label: "Submit a Request", href: "/forms/support-request" },
  secondaryCta: { label: "Sign In", href: "/sign-in" },
};

const DEFAULT_BLOCKS: FeatureBlock[] = [
  {
    id: "default-support",
    title: "Support",
    description:
      "Submit a request and our team will get back to you as soon as possible.",
    icon: "MessageSquare",
    cta: { label: "Get Support", href: "/forms/support-request" },
    order: 0,
  },
  {
    id: "default-billing",
    title: "Billing",
    description:
      "View invoices, manage payment methods, and review your subscription.",
    icon: "CreditCard",
    cta: { label: "View Billing", href: "/billing" },
    order: 1,
  },
  {
    id: "default-kb",
    title: "Knowledge Base",
    description:
      "Browse articles, guides, and FAQs to find answers on your own.",
    icon: "BookOpen",
    cta: { label: "Browse Articles", href: "/knowledge-base" },
    order: 2,
  },
];

export function HomepageTab() {
  const [hero, setHero] = useState<HomepageHero>(DEFAULT_HERO);
  const [blocks, setBlocks] = useState<FeatureBlock[]>(DEFAULT_BLOCKS);
  const [contentAbove, setContentAbove] = useState("");
  const [contentBelow, setContentBelow] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingHero, setSavingHero] = useState(false);
  const [savingAbove, setSavingAbove] = useState(false);
  const [savingBelow, setSavingBelow] = useState(false);

  useEffect(() => {
    getHomepageSettings().then((result) => {
      if (result.success) {
        if (result.data.hero) setHero(result.data.hero);
        if (result.data.blocks) setBlocks(result.data.blocks);
        setContentAbove(result.data.contentAbove);
        setContentBelow(result.data.contentBelow);
      }
      setLoading(false);
    });
  }, []);

  async function handleSaveHero() {
    setSavingHero(true);
    const result = await saveHomepageHero(hero);
    if (result.success) toast.success(result.data.message);
    else toast.error(result.error);
    setSavingHero(false);
  }

  async function handleSaveContent(
    key: "homepageContentAbove" | "homepageContentBelow",
    html: string,
    setLoading: (v: boolean) => void
  ) {
    setLoading(true);
    const result = await saveHomepageContent(key, html);
    if (result.success) toast.success(result.data.message);
    else toast.error(result.error);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading homepage settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Section</CardTitle>
          <CardDescription>
            The main banner at the top of the landing page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={hero.title}
              onChange={(e) => setHero({ ...hero, title: e.target.value })}
              placeholder="How can we help you?"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={hero.description}
              onChange={(e) =>
                setHero({ ...hero, description: e.target.value })
              }
              placeholder="Submit a support request..."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Primary CTA Label</Label>
              <Input
                value={hero.primaryCta.label}
                onChange={(e) =>
                  setHero({
                    ...hero,
                    primaryCta: { ...hero.primaryCta, label: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Primary CTA Link</Label>
              <Input
                value={hero.primaryCta.href}
                onChange={(e) =>
                  setHero({
                    ...hero,
                    primaryCta: { ...hero.primaryCta, href: e.target.value },
                  })
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Secondary CTA Label</Label>
              <Input
                value={hero.secondaryCta.label}
                onChange={(e) =>
                  setHero({
                    ...hero,
                    secondaryCta: {
                      ...hero.secondaryCta,
                      label: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Secondary CTA Link</Label>
              <Input
                value={hero.secondaryCta.href}
                onChange={(e) =>
                  setHero({
                    ...hero,
                    secondaryCta: {
                      ...hero.secondaryCta,
                      href: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>
          <LogoUploadField
            label="Background Image"
            value={hero.backgroundImage || ""}
            onChange={(dataUrl) =>
              setHero({ ...hero, backgroundImage: dataUrl || undefined })
            }
            maxSizeKb={2048}
            accept="image/png,image/jpeg,image/webp"
          />
          <div className="space-y-1.5">
            <Label>Text Color</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={hero.textColor || "#000000"}
                onChange={(e) =>
                  setHero({ ...hero, textColor: e.target.value })
                }
                className="h-10 w-14 cursor-pointer p-1"
              />
              <code className="text-xs text-muted-foreground">
                {hero.textColor || "(default)"}
              </code>
              {hero.textColor && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setHero({ ...hero, textColor: undefined })
                  }
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
          <Button onClick={handleSaveHero} disabled={savingHero}>
            {savingHero && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Hero
          </Button>
        </CardContent>
      </Card>

      {/* Content Above */}
      <Card>
        <CardHeader>
          <CardTitle>Content Above Blocks</CardTitle>
          <CardDescription>
            Rich HTML content displayed between the hero and feature blocks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RichEditor content={contentAbove} onChange={setContentAbove} />
          <Button
            onClick={() =>
              handleSaveContent(
                "homepageContentAbove",
                contentAbove,
                setSavingAbove
              )
            }
            disabled={savingAbove}
          >
            {savingAbove && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Content
          </Button>
        </CardContent>
      </Card>

      {/* Feature Blocks */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Blocks</CardTitle>
          <CardDescription>
            Cards displayed on the landing page. Drag to reorder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeatureBlocksList initialBlocks={blocks} />
        </CardContent>
      </Card>

      {/* Content Below */}
      <Card>
        <CardHeader>
          <CardTitle>Content Below Blocks</CardTitle>
          <CardDescription>
            Rich HTML content displayed below the feature blocks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RichEditor content={contentBelow} onChange={setContentBelow} />
          <Button
            onClick={() =>
              handleSaveContent(
                "homepageContentBelow",
                contentBelow,
                setSavingBelow
              )
            }
            disabled={savingBelow}
          >
            {savingBelow && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Content
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
