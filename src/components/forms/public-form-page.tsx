"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FormRenderer } from "./form-renderer";
import { submitForm } from "@/actions/forms";
import { CheckCircle2 } from "lucide-react";
import type { FormField, FormSettings, FormPrefillData } from "@/types/forms";

interface PublicFormPageProps {
  form: {
    id: string;
    name: string;
    description: string | null;
    fields: FormField[];
    settings: FormSettings;
  };
  prefill: FormPrefillData;
}

export function PublicFormPage({ form, prefill }: PublicFormPageProps) {
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (data: Record<string, string | string[]>) => {
    const result = await submitForm(form.id, data);
    if (result.success) {
      if (form.settings.redirectUrl) {
        window.location.href = form.settings.redirectUrl;
        return;
      }
      setSuccessMessage(result.data.message);
      setSubmitted(true);
    } else {
      toast.error(result.error);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">{successMessage}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="max-w-2xl w-full">
        <div className="rounded-lg border bg-background p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{form.name}</h1>
            {form.description && (
              <p className="text-muted-foreground mt-1">{form.description}</p>
            )}
          </div>
          <FormRenderer
            fields={form.fields}
            prefill={prefill}
            submitLabel={form.settings.submitButtonLabel}
            onSubmit={handleSubmit}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by APM | UC Support
        </p>
      </div>
    </div>
  );
}
