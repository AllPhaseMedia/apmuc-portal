"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormRenderer } from "@/components/forms/form-renderer";
import { submitForm } from "@/actions/forms";
import type { FormField, FormSettings, FormPrefillData } from "@/types/forms";

interface DynamicSupportFormProps {
  formId: string;
  fields: FormField[];
  settings: FormSettings;
  prefill: FormPrefillData;
}

export function DynamicSupportForm({
  formId,
  fields,
  settings,
  prefill,
}: DynamicSupportFormProps) {
  const router = useRouter();
  const [success, setSuccess] = useState(false);

  async function handleSubmit(data: Record<string, string | string[]>) {
    const result = await submitForm(formId, data);
    if (result.success) {
      setSuccess(true);
      toast.success(result.data?.message || settings.successMessage);
    } else {
      toast.error(result.error || "Submission failed");
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Ticket Submitted</h2>
          <p className="text-muted-foreground mb-6">
            {settings.successMessage}
          </p>
          <Button onClick={() => router.push("/support")}>
            Back to Support
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <FormRenderer
          fields={fields}
          prefill={prefill}
          submitLabel={settings.submitButtonLabel || "Submit Ticket"}
          onSubmit={handleSubmit}
        />
      </CardContent>
    </Card>
  );
}
