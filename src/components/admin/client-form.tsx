"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Client, ClientService } from "@prisma/client";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";
import { createClient, updateClient, updateClientServices } from "@/actions/admin/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Props = {
  client?: Client & { services: ClientService[] };
};

const SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS);

export function ClientForm({ client }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>(
    client?.services.map((s) => s.type) ?? []
  );
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const values = {
      name: formData.get("name") as string,
      websiteUrl: formData.get("websiteUrl") as string,
      stripeCustomerId: formData.get("stripeCustomerId") as string,
      umamiSiteId: formData.get("umamiSiteId") as string,
      umamiShareId: formData.get("umamiShareId") as string,
      uptimeKumaMonitorId: formData.get("uptimeKumaMonitorId") as string,
      searchConsoleUrl: formData.get("searchConsoleUrl") as string,
      notes: formData.get("notes") as string,
      isActive: formData.get("isActive") === "on",
    };

    const result = client
      ? await updateClient(client.id, values)
      : await createClient(values);

    if (result.success) {
      // Update services if editing
      if (client) {
        await updateClientServices(client.id, selectedServices as never[]);
      } else if (result.data) {
        await updateClientServices(result.data.id, selectedServices as never[]);
      }
      toast.success(client ? "Client updated" : "Client created");
      router.push("/admin/clients");
      router.refresh();
    } else {
      toast.error(result.error);
    }

    setLoading(false);
  }

  function toggleService(type: string) {
    setSelectedServices((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Client / Company Name *</Label>
            <Input id="name" name="name" defaultValue={client?.name ?? ""} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input id="websiteUrl" name="websiteUrl" placeholder="https://" defaultValue={client?.websiteUrl ?? ""} />
          </div>
          <div className="col-span-full flex items-center gap-2">
            <Switch id="isActive" name="isActive" defaultChecked={client?.isActive ?? true} />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integration IDs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="stripeCustomerId">Stripe Customer ID</Label>
            <Input id="stripeCustomerId" name="stripeCustomerId" placeholder="cus_..." defaultValue={client?.stripeCustomerId ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="umamiSiteId">Umami Site ID</Label>
            <Input id="umamiSiteId" name="umamiSiteId" defaultValue={client?.umamiSiteId ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="umamiShareId">Umami Share ID</Label>
            <Input id="umamiShareId" name="umamiShareId" placeholder="abc123..." defaultValue={client?.umamiShareId ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uptimeKumaMonitorId">Uptime Kuma Monitor ID</Label>
            <Input id="uptimeKumaMonitorId" name="uptimeKumaMonitorId" defaultValue={client?.uptimeKumaMonitorId ?? ""} />
          </div>
          <div className="space-y-2 col-span-full">
            <Label htmlFor="searchConsoleUrl">Search Console URL</Label>
            <Input id="searchConsoleUrl" name="searchConsoleUrl" placeholder="https://" defaultValue={client?.searchConsoleUrl ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {SERVICE_TYPES.map((type) => (
              <div key={type} className="flex items-center gap-2">
                <Checkbox
                  id={`service-${type}`}
                  checked={selectedServices.includes(type)}
                  onCheckedChange={() => toggleService(type)}
                />
                <Label htmlFor={`service-${type}`} className="font-normal">
                  {SERVICE_TYPE_LABELS[type]}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea id="notes" name="notes" rows={4} defaultValue={client?.notes ?? ""} placeholder="Internal notes about this client..." />
        </CardContent>
      </Card>

      <Separator />

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : client ? "Update Client" : "Create Client"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
