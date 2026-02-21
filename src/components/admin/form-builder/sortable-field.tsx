"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { GripVertical, Trash2, Settings2 } from "lucide-react";
import {
  Type, AlignLeft, Mail, Phone, ChevronDown, Circle, CheckSquare, Heading3, Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormField } from "@/types/forms";

const ICONS: Record<string, React.ElementType> = {
  text: Type, textarea: AlignLeft, email: Mail, phone: Phone,
  select: ChevronDown, radio: Circle, checkbox: CheckSquare,
  heading: Heading3, divider: Minus,
};

interface SortableFieldProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function SortableField({ field, isSelected, onSelect, onDelete }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = ICONS[field.type] || Type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border p-2 bg-background",
        "transition-colors",
        isSelected && "border-primary ring-1 ring-primary",
        isDragging && "opacity-50 shadow-lg",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />

      <button
        type="button"
        onClick={onSelect}
        className="flex-1 text-left text-sm truncate"
      >
        {field.label || <span className="text-muted-foreground italic">Untitled</span>}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </button>

      <span className="text-xs text-muted-foreground">{field.type}</span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onSelect}
      >
        <Settings2 className="h-3.5 w-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
