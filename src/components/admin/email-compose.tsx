"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  resolveAudience,
  sendCampaign,
} from "@/actions/admin/email-campaigns";
import type {
  AudienceFilters,
  Recipient,
} from "@/actions/admin/email-campaigns";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";
import { RichEditor } from "@/components/admin/rich-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  allTags: string[];
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "team_member", label: "Team Member" },
  { value: "client", label: "Client" },
];

const INTEGRATION_OPTIONS = [
  { key: "hasAnalytics" as const, label: "Has Analytics" },
  { key: "hasUptime" as const, label: "Has Uptime" },
  { key: "hasBilling" as const, label: "Has Billing" },
];

const defaultFilters: AudienceFilters = {
  tags: [],
  serviceTypes: [],
  integrations: { hasAnalytics: false, hasUptime: false, hasBilling: false },
  roles: [],
};

export function EmailCompose({ allTags }: Props) {
  const [filters, setFilters] = useState<AudienceFilters>(defaultFilters);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audienceResolved, setAudienceResolved] = useState(false);

  const finalRecipients = recipients.filter((r) => !excluded.has(r.email));
  const hasRecipients = audienceResolved && finalRecipients.length > 0;
  const canCompose = hasRecipients;
  const canSend =
    hasRecipients && subject.trim().length > 0 && body.trim().length > 0;

  // ---- Filter Handlers ----

  function toggleRole(role: string) {
    setFilters((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
    setAudienceResolved(false);
  }

  function toggleTag(tag: string) {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
    setAudienceResolved(false);
  }

  function toggleServiceType(type: string) {
    setFilters((prev) => ({
      ...prev,
      serviceTypes: prev.serviceTypes.includes(type)
        ? prev.serviceTypes.filter((s) => s !== type)
        : [...prev.serviceTypes, type],
    }));
    setAudienceResolved(false);
  }

  function toggleIntegration(
    key: "hasAnalytics" | "hasUptime" | "hasBilling"
  ) {
    setFilters((prev) => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        [key]: !prev.integrations[key],
      },
    }));
    setAudienceResolved(false);
  }

  // ---- Actions ----

  async function handleResolveAudience() {
    setAudienceLoading(true);
    try {
      const result = await resolveAudience(filters);
      if (result.success) {
        setRecipients(result.data);
        setExcluded(new Set());
        setAudienceResolved(true);
        if (result.data.length === 0) {
          toast.info("No recipients matched the selected filters.");
        }
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to resolve audience.");
    } finally {
      setAudienceLoading(false);
    }
  }

  function toggleRecipient(email: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  }

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    try {
      const result = await sendCampaign(subject, body, finalRecipients);
      if (result.success) {
        toast.success(
          `Campaign sent to ${finalRecipients.length} recipient${finalRecipients.length === 1 ? "" : "s"}.`
        );
        // Reset all state
        setFilters(defaultFilters);
        setRecipients([]);
        setExcluded(new Set());
        setSubject("");
        setBody("");
        setAudienceResolved(false);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to send campaign.");
    } finally {
      setSending(false);
    }
  }

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Step 1: Audience */}
      <Card>
        <CardHeader>
          <CardTitle>1. Select Audience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* By Role */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">By Role</Label>
            <div className="grid grid-cols-3 gap-3">
              {ROLE_OPTIONS.map((role) => (
                <label
                  key={role.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={filters.roles.includes(role.value)}
                    onCheckedChange={() => toggleRole(role.value)}
                  />
                  {role.label}
                </label>
              ))}
            </div>
          </div>

          {/* By Tag */}
          {allTags.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">By Tag</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {allTags.map((tag) => (
                  <label
                    key={tag}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={filters.tags.includes(tag)}
                      onCheckedChange={() => toggleTag(tag)}
                    />
                    {tag}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* By Service */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">By Service</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
                <label
                  key={value}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={filters.serviceTypes.includes(value)}
                    onCheckedChange={() => toggleServiceType(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* By Integration */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">By Integration</Label>
            <div className="grid grid-cols-3 gap-3">
              {INTEGRATION_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={filters.integrations[opt.key]}
                    onCheckedChange={() => toggleIntegration(opt.key)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Resolve Button */}
          <Button onClick={handleResolveAudience} disabled={audienceLoading}>
            {audienceLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Resolve Audience
          </Button>

          {/* Recipient List */}
          {audienceResolved && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {finalRecipients.length} of {recipients.length} recipient
                {recipients.length === 1 ? "" : "s"} selected
              </p>
              {recipients.length > 0 && (
                <div className="max-h-60 overflow-y-auto rounded-md border p-3">
                  <div className="space-y-2">
                    {recipients.map((r) => (
                      <label
                        key={r.email}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={!excluded.has(r.email)}
                          onCheckedChange={() => toggleRecipient(r.email)}
                        />
                        <span className="font-medium">{r.name}</span>
                        <span className="text-muted-foreground">
                          ({r.email})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Compose */}
      <Card className={canCompose ? "" : "opacity-50 pointer-events-none"}>
        <CardHeader>
          <CardTitle>2. Compose Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              placeholder="Email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <RichEditor content={body} onChange={setBody} />
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Review & Send */}
      <Card className={canSend ? "" : "opacity-50 pointer-events-none"}>
        <CardHeader>
          <CardTitle>3. Review & Send</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Subject</Label>
            <p className="text-base font-bold">{subject}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Preview</Label>
            <div
              className="prose prose-neutral dark:prose-invert max-w-none rounded-md border p-4"
              dangerouslySetInnerHTML={{ __html: body }}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Sending to {finalRecipients.length} recipient
            {finalRecipients.length === 1 ? "" : "s"}
          </p>

          <Button onClick={handleSend} disabled={!canSend || sending}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send to {finalRecipients.length} recipient
            {finalRecipients.length === 1 ? "" : "s"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
