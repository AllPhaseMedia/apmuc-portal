"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { IconSelector } from "./icon-selector";
import type { FeatureBlock } from "@/types/branding";

type Props = {
  block: FeatureBlock;
  onChange: (block: FeatureBlock) => void;
  onDelete: () => void;
};

export function FeatureBlockEditor({ block, onChange, onDelete }: Props) {
  const [expanded, setExpanded] = useState(true);

  const update = (partial: Partial<FeatureBlock>) => {
    onChange({ ...block, ...partial });
  };

  return (
    <div className="rounded-md border bg-background">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {block.title || "Untitled Block"}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {expanded && (
        <div className="border-t px-3 py-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={block.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Feature title"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <IconSelector
                value={block.icon}
                onChange={(icon) => update({ icon })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={block.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Short description..."
              rows={2}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>CTA Label</Label>
              <Input
                value={block.cta.label}
                onChange={(e) =>
                  update({ cta: { ...block.cta, label: e.target.value } })
                }
                placeholder="Learn More"
              />
            </div>
            <div className="space-y-1.5">
              <Label>CTA Link</Label>
              <Input
                value={block.cta.href}
                onChange={(e) =>
                  update({ cta: { ...block.cta, href: e.target.value } })
                }
                placeholder="/forms/support-request"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
