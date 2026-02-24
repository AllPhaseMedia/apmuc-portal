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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

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
  const [tags, setTags] = useState<string[]>(client?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  function addTag() {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

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
      tags,
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
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Type a tag and press Enter"
              className="max-w-xs"
            />
            <Button type="button" variant="outline" size="sm" onClick={addTag} disabled={!tagInput.trim()}>
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
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
