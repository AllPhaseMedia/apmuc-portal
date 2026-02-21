"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ICON_MAP, ICON_NAMES, LucideIcon } from "@/components/public/lucide-icon";

type Props = {
  value: string;
  onChange: (name: string) => void;
};

export function IconSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <LucideIcon name={value} className="h-4 w-4" />
          <span className="text-xs">{value || "Select icon"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="grid grid-cols-6 gap-1">
          {ICON_NAMES.map((name) => {
            const Icon = ICON_MAP[name];
            return (
              <button
                key={name}
                type="button"
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                  value === name
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                title={name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
