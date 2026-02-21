"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { RecommendedService, Form } from "@prisma/client";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";
import {
  createRecommendedService,
  updateRecommendedService,
  deleteRecommendedService,
} from "@/actions/admin/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS);

type FormSummary = Pick<Form, "id" | "name" | "isActive"> & {
  _count: { submissions: number };
};

type Props = {
  service?: RecommendedService;
  forms?: FormSummary[];
  children: React.ReactNode;
};

export function ServiceDialog({ service, forms = [], children }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string>(service?.type ?? "HOSTING");
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [formId, setFormId] = useState<string>(service?.formId ?? "none");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const values = {
      type: type as never,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      features: formData.get("features") as string,
      ctaUrl: formData.get("ctaUrl") as string,
      ctaLabel: formData.get("ctaLabel") as string,
      formId: formId === "none" ? null : formId,
      isActive,
    };

    const result = service
      ? await updateRecommendedService(service.id, values)
      : await createRecommendedService(values);

    if (result.success) {
      toast.success(service ? "Service updated" : "Service created");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  async function onDelete() {
    if (!service) return;
    setLoading(true);
    const result = await deleteRecommendedService(service.id);
    if (result.success) {
      toast.success("Service deleted");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  const featuresDefault = service?.features
    ? (service.features as string[]).join("\n")
    : "";

  const hasLinkedForm = formId !== "none";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {service ? "Edit Service" : "New Recommended Service"}
            </DialogTitle>
            <DialogDescription>
              {service
                ? "Update the service details."
                : "Add a new service recommendation shown to clients."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {SERVICE_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-title">Title *</Label>
                <Input
                  id="svc-title"
                  name="title"
                  defaultValue={service?.title ?? ""}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="svc-desc">Description *</Label>
              <Textarea
                id="svc-desc"
                name="description"
                rows={3}
                defaultValue={service?.description ?? ""}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="svc-features">Features (one per line)</Label>
              <Textarea
                id="svc-features"
                name="features"
                rows={4}
                defaultValue={featuresDefault}
                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
              />
            </div>

            {/* Form Link */}
            <div className="space-y-2">
              <Label>Link to Form</Label>
              <Select value={formId} onValueChange={setFormId}>
                <SelectTrigger>
                  <SelectValue placeholder="No form linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No form (use URL)</SelectItem>
                  {forms.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasLinkedForm && (
                <p className="text-xs text-muted-foreground">
                  CTA will open this form in a modal dialog with client info pre-filled.
                </p>
              )}
            </div>

            {/* CTA URL/Label - show URL only when no form is linked */}
            <div className="grid gap-4 sm:grid-cols-2">
              {!hasLinkedForm && (
                <div className="space-y-2">
                  <Label htmlFor="svc-cta-url">CTA URL</Label>
                  <Input
                    id="svc-cta-url"
                    name="ctaUrl"
                    placeholder="https://"
                    defaultValue={service?.ctaUrl ?? ""}
                  />
                </div>
              )}
              {hasLinkedForm && (
                <div className="space-y-2">
                  <Label htmlFor="svc-cta-url">CTA URL</Label>
                  <Input
                    id="svc-cta-url"
                    name="ctaUrl"
                    value=""
                    disabled
                    placeholder="Using linked form"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="svc-cta-label">CTA Label</Label>
                <Input
                  id="svc-cta-label"
                  name="ctaLabel"
                  defaultValue={service?.ctaLabel ?? "Learn More"}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="svc-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="svc-active">Active</Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            {service && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={loading}
                className="mr-auto"
              >
                Delete
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : service
                  ? "Update"
                  : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
