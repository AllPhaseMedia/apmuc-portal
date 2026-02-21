"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { FileUploadField, fileToBase64 } from "@/components/forms/file-upload-field";
import type { FileAttachment } from "@/components/forms/file-upload-field";
import type { FormField, FormPrefillData, ConditionOperator } from "@/types/forms";

interface FormRendererProps {
  fields: FormField[];
  prefill?: FormPrefillData;
  submitLabel?: string;
  onSubmit: (data: Record<string, string | string[]>) => Promise<void>;
  disabled?: boolean;
  preview?: boolean;
}

function evaluateCondition(
  operator: ConditionOperator,
  fieldValue: string | string[] | undefined,
  conditionValue?: string
): boolean {
  const val = Array.isArray(fieldValue) ? fieldValue.join(", ") : (fieldValue || "");
  switch (operator) {
    case "equals":
      return val === (conditionValue || "");
    case "notEquals":
      return val !== (conditionValue || "");
    case "contains":
      return val.toLowerCase().includes((conditionValue || "").toLowerCase());
    case "isEmpty":
      return val === "";
    case "isNotEmpty":
      return val !== "";
    default:
      return true;
  }
}

export function FormRenderer({
  fields,
  prefill,
  submitLabel = "Submit",
  onSubmit,
  disabled = false,
  preview = false,
}: FormRendererProps) {
  const initialData = useMemo(() => {
    const data: Record<string, string | string[]> = {};
    for (const field of fields) {
      if (field.prefillKey && prefill) {
        const prefillValue = prefill[field.prefillKey];
        if (prefillValue) {
          data[field.id] = prefillValue;
        }
      }
    }
    return data;
  }, [fields, prefill]);

  const [formData, setFormData] = useState<Record<string, string | string[]>>(initialData);
  const [fileData, setFileData] = useState<Record<string, FileAttachment[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const setValue = useCallback((fieldId: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const isFieldVisible = useCallback(
    (field: FormField): boolean => {
      if (!field.conditions || field.conditions.length === 0) return true;
      return field.conditions.every((cond) =>
        evaluateCondition(cond.operator, formData[cond.fieldId], cond.value)
      );
    },
    [formData]
  );

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (!isFieldVisible(field)) continue;
      if (field.required && !field.type.match(/^(heading|divider)$/)) {
        if (field.type === "file") {
          if (!fileData[field.id] || fileData[field.id].length === 0) {
            newErrors[field.id] = `${field.label} is required`;
          }
        } else {
          const val = formData[field.id];
          if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === "string" && val.trim() === "")) {
            newErrors[field.id] = `${field.label} is required`;
          }
        }
      }
      if (field.type === "email" && formData[field.id]) {
        const emailVal = formData[field.id] as string;
        if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
          newErrors[field.id] = "Please enter a valid email address";
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [fields, formData, fileData, isFieldVisible]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preview || disabled) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Convert file fields to base64 JSON strings
      const submitData = { ...formData };
      for (const field of fields) {
        if (field.type === "file" && fileData[field.id]?.length) {
          const attachments = await Promise.all(
            fileData[field.id].map(async ({ file }) => ({
              fileName: file.name,
              mimeType: file.type || "application/octet-stream",
              data: await fileToBase64(file),
            }))
          );
          submitData[field.id] = JSON.stringify(attachments);
        }
      }
      await onSubmit(submitData);
    } finally {
      setSubmitting(false);
    }
  };

  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => a.order - b.order),
    [fields]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {sortedFields.map((field) => {
          if (!isFieldVisible(field)) return null;

          const widthClass = field.width === "half" ? "w-full sm:w-[calc(50%-0.5rem)]" : "w-full";

          if (field.type === "heading") {
            return (
              <div key={field.id} className={widthClass}>
                <h3 className="text-lg font-semibold mt-2">{field.label}</h3>
              </div>
            );
          }

          if (field.type === "divider") {
            return (
              <div key={field.id} className="w-full">
                <hr className="my-2 border-border" />
              </div>
            );
          }

          const error = errors[field.id];

          return (
            <div key={field.id} className={`${widthClass} space-y-1.5`}>
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>

              {(field.type === "text" || field.type === "email" || field.type === "phone") && (
                <Input
                  id={field.id}
                  type={field.type === "phone" ? "tel" : field.type}
                  placeholder={field.placeholder}
                  value={(formData[field.id] as string) || ""}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  disabled={disabled}
                />
              )}

              {field.type === "textarea" && (
                <Textarea
                  id={field.id}
                  placeholder={field.placeholder}
                  value={(formData[field.id] as string) || ""}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  disabled={disabled}
                  rows={4}
                />
              )}

              {field.type === "select" && (
                <Select
                  value={(formData[field.id] as string) || ""}
                  onValueChange={(val) => setValue(field.id, val)}
                  disabled={disabled}
                >
                  <SelectTrigger id={field.id}>
                    <SelectValue placeholder={field.placeholder || "Select..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {field.type === "radio" && (
                <RadioGroup
                  value={(formData[field.id] as string) || ""}
                  onValueChange={(val) => setValue(field.id, val)}
                  disabled={disabled}
                >
                  {field.options?.map((opt) => (
                    <div key={opt} className="flex items-center gap-2">
                      <RadioGroupItem value={opt} id={`${field.id}-${opt}`} />
                      <Label htmlFor={`${field.id}-${opt}`} className="font-normal">
                        {opt}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {field.type === "checkbox" && (
                <div className="space-y-2">
                  {field.options?.map((opt) => {
                    const checked = ((formData[field.id] as string[]) || []).includes(opt);
                    return (
                      <div key={opt} className="flex items-center gap-2">
                        <Checkbox
                          id={`${field.id}-${opt}`}
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={(isChecked) => {
                            const current = (formData[field.id] as string[]) || [];
                            setValue(
                              field.id,
                              isChecked
                                ? [...current, opt]
                                : current.filter((v) => v !== opt)
                            );
                          }}
                        />
                        <Label htmlFor={`${field.id}-${opt}`} className="font-normal">
                          {opt}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}

              {field.type === "file" && (
                <FileUploadField
                  files={fileData[field.id] || []}
                  onChange={(files) =>
                    setFileData((prev) => ({ ...prev, [field.id]: files }))
                  }
                  maxFileSize={field.maxFileSize}
                  acceptedTypes={field.acceptedTypes}
                  disabled={disabled}
                />
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          );
        })}
      </div>

      {!preview && (
        <Button type="submit" disabled={disabled || submitting} className="w-full sm:w-auto">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      )}
    </form>
  );
}
