"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureBlockEditor } from "./feature-block-editor";
import { saveHomepageBlocks } from "@/actions/admin/branding";
import type { FeatureBlock } from "@/types/branding";

type Props = {
  initialBlocks: FeatureBlock[];
};

function SortableBlock({
  block,
  onChange,
  onDelete,
}: {
  block: FeatureBlock;
  onChange: (b: FeatureBlock) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex gap-2 ${isDragging ? "opacity-50" : ""}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-3 px-0.5"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">
        <FeatureBlockEditor
          block={block}
          onChange={onChange}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

export function FeatureBlocksList({ initialBlocks }: Props) {
  const [blocks, setBlocks] = useState<FeatureBlock[]>(initialBlocks);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      return reordered.map((b, i) => ({ ...b, order: i }));
    });
  };

  const addBlock = () => {
    const newBlock: FeatureBlock = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      icon: "Star",
      cta: { label: "", href: "" },
      order: blocks.length,
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  const updateBlock = (id: string, updated: FeatureBlock) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? updated : b)));
  };

  const deleteBlock = (id: string) => {
    setBlocks((prev) =>
      prev
        .filter((b) => b.id !== id)
        .map((b, i) => ({ ...b, order: i }))
    );
  };

  async function handleSave() {
    setSaving(true);
    const result = await saveHomepageBlocks(blocks);
    if (result.success) {
      toast.success(result.data.message);
    } else {
      toast.error(result.error);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {blocks.map((block) => (
            <SortableBlock
              key={block.id}
              block={block}
              onChange={(updated) => updateBlock(block.id, updated)}
              onDelete={() => deleteBlock(block.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={addBlock}>
          <Plus className="h-4 w-4 mr-1" />
          Add Block
        </Button>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Blocks
        </Button>
      </div>
    </div>
  );
}
