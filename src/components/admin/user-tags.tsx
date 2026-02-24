"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setUserTags } from "@/actions/admin/impersonate";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

type Props = {
  userId: string;
  tags: string[];
};

export function UserTags({ userId, tags: initialTags }: Props) {
  const router = useRouter();
  const [tags, setTags] = useState(initialTags);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

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

  function addTag() {
    const tag = input.trim();
    if (tag && !tags.includes(tag)) {
      save([...tags, tag]);
    }
    setInput("");
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
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag();
          }
        }}
        onBlur={() => {
          if (input.trim()) addTag();
        }}
        disabled={saving}
        placeholder="+ tag"
        className="h-6 w-20 text-xs px-1.5 border-dashed"
      />
    </div>
  );
}
