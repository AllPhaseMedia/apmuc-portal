"use client";

import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import {
  Type,
  AlignLeft,
  Mail,
  Phone,
  ChevronDown,
  Circle,
  CheckSquare,
  Heading3,
  Minus,
} from "lucide-react";
import type { FormFieldType } from "@/types/forms";
import { FIELD_TYPES } from "@/types/forms";

const ICONS: Record<string, React.ElementType> = {
  Type,
  AlignLeft,
  Mail,
  Phone,
  ChevronDown,
  Circle,
  CheckSquare,
  Heading3,
  Minus,
};

function PaletteItem({ type, label, icon }: { type: FormFieldType; label: string; icon: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type, fromPalette: true },
  });

  const Icon = ICONS[icon] || Type;

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm",
        "hover:bg-accent hover:text-accent-foreground cursor-grab active:cursor-grabbing",
        "transition-colors",
        isDragging && "opacity-50"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

export function FieldPalette() {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Add Fields</h4>
      <div className="flex flex-wrap gap-2">
        {FIELD_TYPES.map((ft) => (
          <PaletteItem key={ft.type} type={ft.type} label={ft.label} icon={ft.icon} />
        ))}
      </div>
    </div>
  );
}
