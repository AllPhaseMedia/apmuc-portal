"use client";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { SortableField } from "./sortable-field";
import type { FormField } from "@/types/forms";

interface FieldListProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onDeleteField: (id: string) => void;
}

export function FieldList({ fields, selectedFieldId, onSelectField, onDeleteField }: FieldListProps) {
  const { setNodeRef } = useDroppable({ id: "field-list" });

  const sorted = [...fields].sort((a, b) => a.order - b.order);

  return (
    <div ref={setNodeRef} className="space-y-2 min-h-[100px]">
      {sorted.length === 0 && (
        <div className="flex items-center justify-center rounded-md border border-dashed p-8 text-sm text-muted-foreground">
          Drag fields here to build your form
        </div>
      )}
      <SortableContext items={sorted.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        {sorted.map((field) => (
          <SortableField
            key={field.id}
            field={field}
            isSelected={field.id === selectedFieldId}
            onSelect={() => onSelectField(field.id)}
            onDelete={() => onDeleteField(field.id)}
          />
        ))}
      </SortableContext>
    </div>
  );
}
