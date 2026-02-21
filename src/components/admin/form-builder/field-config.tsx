"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import type { FormField, ConditionOperator, PrefillKey } from "@/types/forms";

interface FieldConfigProps {
  field: FormField;
  allFields: FormField[];
  onChange: (updated: FormField) => void;
  onClose: () => void;
}

export function FieldConfig({ field, allFields, onChange, onClose }: FieldConfigProps) {
  const hasOptions = ["select", "radio", "checkbox"].includes(field.type);
  const hasPlaceholder = ["text", "textarea", "email", "phone", "select"].includes(field.type);
  const isLayout = ["heading", "divider"].includes(field.type);

  const otherFields = allFields.filter(
    (f) => f.id !== field.id && !["heading", "divider"].includes(f.type)
  );

  return (
    <div className="space-y-4 p-4 border rounded-md bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Configure: {field.type}</h4>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Label */}
      <div className="space-y-1.5">
        <Label>Label</Label>
        <Input
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="Field label"
        />
      </div>

      {/* Placeholder */}
      {hasPlaceholder && (
        <div className="space-y-1.5">
          <Label>Placeholder</Label>
          <Input
            value={field.placeholder || ""}
            onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
            placeholder="Placeholder text"
          />
        </div>
      )}

      {/* Required */}
      {!isLayout && (
        <div className="flex items-center justify-between">
          <Label>Required</Label>
          <Switch
            checked={field.required || false}
            onCheckedChange={(checked) => onChange({ ...field, required: checked })}
          />
        </div>
      )}

      {/* Width */}
      {!isLayout && (
        <div className="space-y-1.5">
          <Label>Width</Label>
          <Select
            value={field.width || "full"}
            onValueChange={(val) => onChange({ ...field, width: val as "full" | "half" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full Width</SelectItem>
              <SelectItem value="half">Half Width</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Prefill Key */}
      {!isLayout && (
        <div className="space-y-1.5">
          <Label>Auto-fill from</Label>
          <Select
            value={field.prefillKey || "none"}
            onValueChange={(val) =>
              onChange({ ...field, prefillKey: val === "none" ? undefined : (val as PrefillKey) })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="name">Client Name</SelectItem>
              <SelectItem value="email">Client Email</SelectItem>
              <SelectItem value="website">Client Website</SelectItem>
              <SelectItem value="serviceName">Service Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* File-specific config */}
      {field.type === "file" && (
        <>
          <div className="space-y-1.5">
            <Label>Max File Size (MB)</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={field.maxFileSize ?? 10}
              onChange={(e) =>
                onChange({ ...field, maxFileSize: parseInt(e.target.value) || 10 })
              }
              placeholder="10"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Accepted File Types</Label>
            <Input
              value={field.acceptedTypes || ""}
              onChange={(e) =>
                onChange({ ...field, acceptedTypes: e.target.value })
              }
              placeholder="image/*,.pdf,.doc,.docx"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated MIME types or extensions. Leave blank for any.
            </p>
          </div>
        </>
      )}

      {/* Options (for select, radio, checkbox) */}
      {hasOptions && (
        <div className="space-y-1.5">
          <Label>Options (one per line)</Label>
          <Textarea
            value={(field.options || []).join("\n")}
            onChange={(e) =>
              onChange({
                ...field,
                options: e.target.value.split("\n").filter((o) => o.trim() !== ""),
              })
            }
            placeholder={"Option 1\nOption 2\nOption 3"}
            rows={4}
          />
        </div>
      )}

      {/* Conditional Show/Hide */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Show/Hide Conditions</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...field,
                conditions: [
                  ...(field.conditions || []),
                  { fieldId: "", operator: "equals" as ConditionOperator, value: "" },
                ],
              })
            }
            disabled={otherFields.length === 0}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Condition
          </Button>
        </div>

        {field.conditions?.map((cond, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <Select
              value={cond.fieldId}
              onValueChange={(val) => {
                const conditions = [...(field.conditions || [])];
                conditions[idx] = { ...conditions[idx], fieldId: val };
                onChange({ ...field, conditions });
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Field..." />
              </SelectTrigger>
              <SelectContent>
                {otherFields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={cond.operator}
              onValueChange={(val) => {
                const conditions = [...(field.conditions || [])];
                conditions[idx] = { ...conditions[idx], operator: val as ConditionOperator };
                onChange({ ...field, conditions });
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">equals</SelectItem>
                <SelectItem value="notEquals">not equals</SelectItem>
                <SelectItem value="contains">contains</SelectItem>
                <SelectItem value="isEmpty">is empty</SelectItem>
                <SelectItem value="isNotEmpty">is not empty</SelectItem>
              </SelectContent>
            </Select>

            {!["isEmpty", "isNotEmpty"].includes(cond.operator) && (
              <Input
                value={cond.value || ""}
                onChange={(e) => {
                  const conditions = [...(field.conditions || [])];
                  conditions[idx] = { ...conditions[idx], value: e.target.value };
                  onChange({ ...field, conditions });
                }}
                placeholder="Value"
                className="w-[120px]"
              />
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => {
                const conditions = (field.conditions || []).filter((_, i) => i !== idx);
                onChange({ ...field, conditions });
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
