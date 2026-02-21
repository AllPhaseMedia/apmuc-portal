"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, Loader2, Eye } from "lucide-react";
import { FieldPalette } from "./field-palette";
import { FieldList } from "./field-list";
import { FieldConfig } from "./field-config";
import { FormSettingsPanel } from "./form-settings-panel";
import { FormRenderer } from "@/components/forms/form-renderer";
import { createForm, updateForm } from "@/actions/admin/forms";
import type { FormField, FormSettings } from "@/types/forms";
import { DEFAULT_FORM_SETTINGS } from "@/types/forms";
import type { Form } from "@prisma/client";

interface FormBuilderProps {
  form?: Form;
}

function generateFieldId(): string {
  return `field_${Math.random().toString(36).substring(2, 10)}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function FormBuilder({ form }: FormBuilderProps) {
  const router = useRouter();
  const isEdit = !!form;

  const [name, setName] = useState(form?.name || "");
  const [slug, setSlug] = useState(form?.slug || "");
  const [description, setDescription] = useState(form?.description || "");
  const [isActive, setIsActive] = useState(form?.isActive ?? true);
  const [isPublic, setIsPublic] = useState(form?.isPublic ?? false);

  const [fields, setFields] = useState<FormField[]>(
    (form?.fields as unknown as FormField[]) || []
  );

  const [settings, setSettings] = useState<FormSettings>(
    form?.settings
      ? { ...DEFAULT_FORM_SETTINGS, ...(form.settings as unknown as Partial<FormSettings>) }
      : { ...DEFAULT_FORM_SETTINGS }
  );

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [autoSlug, setAutoSlug] = useState(!isEdit);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      if (autoSlug) {
        setSlug(slugify(value));
      }
    },
    [autoSlug]
  );

  const addField = useCallback((type: FormField["type"]) => {
    const newField: FormField = {
      id: generateFieldId(),
      type,
      label: type === "heading" ? "Section Title" : type === "divider" ? "" : `New ${type} field`,
      order: fields.length,
      required: false,
      width: "full",
    };
    if (["select", "radio", "checkbox"].includes(type)) {
      newField.options = ["Option 1", "Option 2"];
    }
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setShowPreview(false);
  }, [fields.length]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    if (active.data.current?.fromPalette) {
      addField(active.data.current.type);
      return;
    }

    if (active.id !== over.id) {
      setFields((prev) => {
        const sorted = [...prev].sort((a, b) => a.order - b.order);
        const oldIndex = sorted.findIndex((f) => f.id === active.id);
        const newIndex = sorted.findIndex((f) => f.id === over.id);
        const reordered = arrayMove(sorted, oldIndex, newIndex);
        return reordered.map((f, i) => ({ ...f, order: i }));
      });
    }
  };

  const updateField = useCallback((updated: FormField) => {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }, []);

  const deleteField = useCallback(
    (id: string) => {
      setFields((prev) => {
        const filtered = prev.filter((f) => f.id !== id);
        return filtered.map((f, i) => ({ ...f, order: i }));
      });
      if (selectedFieldId === id) setSelectedFieldId(null);
    },
    [selectedFieldId]
  );

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Form name is required");
      return;
    }
    if (!slug.trim()) {
      toast.error("Slug is required");
      return;
    }

    setSaving(true);
    try {
      const values = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        fields,
        settings,
        isActive,
        isPublic,
      };

      const result = isEdit
        ? await updateForm(form.id, values)
        : await createForm(values);

      if (result.success) {
        toast.success(isEdit ? "Form updated" : "Form created");
        if (!isEdit) {
          router.push(`/admin/forms/${result.data.id}`);
        }
      } else {
        toast.error(result.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <Label>Form Name</Label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Form"
            />
          </div>
          <div className="w-[200px] space-y-1.5">
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setAutoSlug(false);
              }}
              placeholder="my-form"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
              <Label htmlFor="active">Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isPublic} onCheckedChange={setIsPublic} id="public" />
              <Label htmlFor="public">Public</Label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-1.5" />
              {showPreview ? "Edit" : "Preview"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4 mr-1.5" />
              Settings
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              Save
            </Button>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label>Description (optional)</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description shown above the form"
          />
        </div>

        {/* Main content */}
        {showPreview ? (
          <div className="max-w-2xl mx-auto border rounded-lg p-6 bg-background">
            <h2 className="text-xl font-semibold mb-1">{name || "Untitled Form"}</h2>
            {description && (
              <p className="text-muted-foreground mb-4">{description}</p>
            )}
            <FormRenderer
              fields={fields}
              submitLabel={settings.submitButtonLabel}
              onSubmit={async () => {}}
              preview
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Palette + Field List */}
            <div className="space-y-4">
              <FieldPalette />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Form Fields ({fields.length})
                </h4>
                <FieldList
                  fields={fields}
                  selectedFieldId={selectedFieldId}
                  onSelectField={(id) => setSelectedFieldId(id)}
                  onDeleteField={deleteField}
                />
              </div>
            </div>

            {/* Right: Config panel or preview */}
            <div>
              {selectedField ? (
                <FieldConfig
                  field={selectedField}
                  allFields={fields}
                  onChange={updateField}
                  onClose={() => setSelectedFieldId(null)}
                />
              ) : (
                <div className="border rounded-lg p-6 bg-background">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4">
                    Live Preview
                  </h4>
                  <FormRenderer
                    fields={fields}
                    submitLabel={settings.submitButtonLabel}
                    onSubmit={async () => {}}
                    preview
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <FormSettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onChange={setSettings}
      />

      <DragOverlay>
        {activeDragId ? (
          <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-lg opacity-80">
            Dragging...
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
