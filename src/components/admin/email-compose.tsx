"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, UserPlus } from "lucide-react";
import {
  resolveAudience,
  sendCampaign,
  listAllUsers,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

  // User picker dialog state
  const [manualAdds, setManualAdds] = useState<Recipient[]>([]);
  const [allUsers, setAllUsers] = useState<Recipient[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  // Track selected emails within the picker (committed on close)
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());

  // Merge filter-resolved recipients with manual adds (dedup by email)
  const mergedRecipients = (() => {
    const map = new Map<string, Recipient>();
    for (const r of recipients) map.set(r.email, r);
    for (const r of manualAdds) map.set(r.email, r);
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();
  const finalRecipients = mergedRecipients.filter((r) => !excluded.has(r.email));
  const hasRecipients = (audienceResolved || manualAdds.length > 0) && finalRecipients.length > 0;
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

  // ---- User Picker ----

  async function openPicker() {
    setPickerOpen(true);
    setUserSearch("");
    // Initialize picker selection from current manual adds
    setPickerSelected(new Set(manualAdds.map((r) => r.email)));
    if (!usersLoaded) {
      setUsersLoading(true);
      const result = await listAllUsers();
      if (result.success) {
        setAllUsers(result.data);
        setUsersLoaded(true);
      }
      setUsersLoading(false);
    }
  }

  function togglePickerUser(email: string) {
    setPickerSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  function commitPickerSelection() {
    const selected = allUsers.filter((u) => pickerSelected.has(u.email));
    setManualAdds(selected);
    setPickerOpen(false);
  }

  const filteredPickerUsers = userSearch.trim().length > 0
    ? allUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
          (u.clients ?? []).some((c) =>
            c.toLowerCase().includes(userSearch.toLowerCase())
          )
      )
    : allUsers;

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
        setManualAdds([]);
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

          {/* Select Individual Users */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Individual Users</Label>
            <div className="flex items-center gap-3">
              <Dialog open={pickerOpen} onOpenChange={(open) => {
                if (!open) commitPickerSelection();
                else openPicker();
              }}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Choose Users
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>
                      Select Recipients ({pickerSelected.size} selected)
                    </DialogTitle>
                  </DialogHeader>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or client..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto border rounded-md min-h-0">
                    {usersLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading users...</span>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-background border-b">
                          <tr>
                            <th className="w-10 p-3">
                              <Checkbox
                                checked={
                                  filteredPickerUsers.length > 0 &&
                                  filteredPickerUsers.every((u) => pickerSelected.has(u.email))
                                }
                                onCheckedChange={(checked) => {
                                  setPickerSelected((prev) => {
                                    const next = new Set(prev);
                                    for (const u of filteredPickerUsers) {
                                      if (checked) next.add(u.email);
                                      else next.delete(u.email);
                                    }
                                    return next;
                                  });
                                }}
                              />
                            </th>
                            <th className="text-left p-3 font-medium">User</th>
                            <th className="text-left p-3 font-medium">Client</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPickerUsers.map((u) => (
                            <tr
                              key={u.email}
                              className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                              onClick={() => togglePickerUser(u.email)}
                            >
                              <td className="p-3">
                                <Checkbox
                                  checked={pickerSelected.has(u.email)}
                                  onCheckedChange={() => togglePickerUser(u.email)}
                                />
                              </td>
                              <td className="p-3">
                                <div className="font-medium">{u.name}</div>
                                <div className="text-muted-foreground text-xs">{u.email}</div>
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {(u.clients ?? []).length > 0
                                  ? (u.clients ?? []).join(", ")
                                  : <span className="text-muted-foreground/50">&mdash;</span>
                                }
                              </td>
                            </tr>
                          ))}
                          {filteredPickerUsers.length === 0 && (
                            <tr>
                              <td colSpan={3} className="p-6 text-center text-muted-foreground">
                                No users found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="button" onClick={commitPickerSelection}>
                      Done ({pickerSelected.size} selected)
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              {manualAdds.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {manualAdds.length} user{manualAdds.length === 1 ? "" : "s"} selected
                </span>
              )}
            </div>
          </div>

          {/* Recipient List */}
          {(audienceResolved || manualAdds.length > 0) && mergedRecipients.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {finalRecipients.length} of {mergedRecipients.length} recipient
                {mergedRecipients.length === 1 ? "" : "s"} selected
              </p>
              <div className="max-h-60 overflow-y-auto rounded-md border p-3">
                <div className="space-y-2">
                  {mergedRecipients.map((r) => (
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
