"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setUserTags } from "@/actions/admin/impersonate";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

type Props = {
  userId: string;
  tags: string[];
  allTags: string[];
};

export function UserTags({ userId, tags: initialTags, allTags }: Props) {
  const router = useRouter();
  const [tags, setTags] = useState(initialTags);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tags not already on this user, filtered by input
  const suggestions = allTags.filter(
    (t) => !tags.includes(t) && t.toLowerCase().includes(input.toLowerCase())
  );

  async function save(newTags: string[]) {
    setSaving(true);
    setTags(newTags);
    const result = await setUserTags(userId, newTags);
    if (!result.success) {
      toast.error("Failed to update tags");
      setTags(initialTags);
    }
    setSaving(false);
    router.refresh();
  }

  function addTag(value?: string) {
    const tag = (value ?? input).trim();
    if (tag && !tags.includes(tag)) {
      save([...tags, tag]);
    }
    setInput("");
    setShowSuggestions(false);
  }

  function removeTag(tag: string) {
    save(tags.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <Badge key={tag} variant="outline" className="text-xs gap-0.5 pr-0.5">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            disabled={saving}
            className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <div className="relative">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => setShowSuggestions(false), 150);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
            if (e.key === "Escape") {
              setShowSuggestions(false);
            }
          }}
          disabled={saving}
          placeholder="+ tag"
          className="h-6 w-20 text-xs px-1.5 border-dashed"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 z-50 mt-1 w-32 rounded-md border bg-popover p-1 shadow-md">
            {suggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  addTag(tag);
                  inputRef.current?.focus();
                }}
                className="flex w-full items-center rounded-sm px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
