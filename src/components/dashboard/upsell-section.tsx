"use client";

import { useState } from "react";
import type { RecommendedService, Form } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { FormRenderer } from "@/components/forms/form-renderer";
import { submitForm } from "@/actions/forms";
import type { FormField, FormSettings, FormPrefillData } from "@/types/forms";

type ServiceWithForm = RecommendedService & {
  form?: Pick<Form, "id" | "name" | "fields" | "settings" | "isActive"> | null;
};

type Props = {
  services: ServiceWithForm[];
  prefill?: FormPrefillData;
};

function handleCtaClick(url: string) {
  if (url.startsWith("mailto:")) {
    const emailMatch = url.match(/^mailto:([^?]*)/);
    const subjectMatch = url.match(/subject=([^&]*)/);
    const email = emailMatch?.[1] ?? "";
    const subject = subjectMatch ? decodeURIComponent(subjectMatch[1]) : "";

    window.location.href = url;

    toast("Opening email client", {
      description: email + (subject ? ` — ${subject}` : ""),
      action: {
        label: "Copy email",
        onClick: () => {
          navigator.clipboard.writeText(email);
          toast.success("Email copied to clipboard");
        },
      },
    });
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function UpsellSection({ services, prefill }: Props) {
  const [formDialogService, setFormDialogService] = useState<ServiceWithForm | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  if (services.length === 0) return null;

  const activeForm = formDialogService?.form;
  const formFields = activeForm ? (activeForm.fields as unknown as FormField[]) : [];
  const formSettings = activeForm ? (activeForm.settings as unknown as FormSettings) : null;

  const handleFormSubmit = async (data: Record<string, string | string[]>) => {
    if (!activeForm) return;
    const result = await submitForm(activeForm.id, data);
    if (result.success) {
      setSuccessMessage(result.data.message);
      setSubmitted(true);
    } else {
      toast.error(result.error);
    }
  };

  const closeFormDialog = () => {
    setFormDialogService(null);
    setSubmitted(false);
    setSuccessMessage("");
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">Grow Your Business</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const features = (service.features as string[]) ?? [];
            const hasForm = service.form && service.form.isActive;

            return (
              <Card key={service.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{service.title}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {SERVICE_TYPE_LABELS[service.type] ?? service.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <p className="text-sm text-muted-foreground">
                    {service.description}
                  </p>
                  {features.length > 0 && (
                    <ul className="text-sm space-y-1">
                      {features.slice(0, 4).map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">&#x2022;</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  {(hasForm || service.ctaUrl) && (
                    <div className="mt-auto pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (hasForm) {
                            setFormDialogService(service);
                          } else if (service.ctaUrl) {
                            handleCtaClick(service.ctaUrl);
                          }
                        }}
                      >
                        {service.ctaLabel}
                        <ArrowRight className="ml-2 h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Form dialog for service CTA */}
      <Dialog open={!!formDialogService} onOpenChange={(open) => !open && closeFormDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
              <p className="text-lg font-semibold">{successMessage}</p>
              <Button onClick={closeFormDialog}>Close</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{activeForm?.name || formDialogService?.title}</DialogTitle>
              </DialogHeader>
              {formFields.length > 0 && formSettings && (
                <FormRenderer
                  fields={formFields}
                  prefill={{
                    ...prefill,
                    serviceName: formDialogService?.title,
                  }}
                  submitLabel={formSettings.submitButtonLabel}
                  onSubmit={handleFormSubmit}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
