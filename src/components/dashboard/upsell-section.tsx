"use client";

import type { RecommendedService } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";
import { ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Props = {
  services: RecommendedService[];
};

function handleCtaClick(url: string) {
  if (url.startsWith("mailto:")) {
    // Extract email and subject from mailto URL
    const emailMatch = url.match(/^mailto:([^?]*)/);
    const subjectMatch = url.match(/subject=([^&]*)/);
    const email = emailMatch?.[1] ?? "";
    const subject = subjectMatch ? decodeURIComponent(subjectMatch[1]) : "";

    // Try opening the mailto link
    window.location.href = url;

    // Show toast with email info as fallback
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

export function UpsellSection({ services }: Props) {
  if (services.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold">Grow Your Business</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          const features = (service.features as string[]) ?? [];
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
                {service.ctaUrl && (
                  <div className="mt-auto pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCtaClick(service.ctaUrl!)}
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
  );
}
