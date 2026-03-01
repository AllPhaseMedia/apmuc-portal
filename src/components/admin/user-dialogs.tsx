"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Trash2 } from "lucide-react";
import type { ClerkUserInfo } from "@/actions/admin/impersonate";
import { setUserTags } from "@/actions/admin/impersonate";
import {
  createUser,
  updateUser,
} from "@/actions/admin/users";
import {
  addClientContact,
  updateClientContact,
  removeClientContact,
  listAllClients,
} from "@/actions/admin/contacts";
import { ALL_PERMISSIONS, PERMISSION_LABELS, type ContactPermission } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const ROLE_OPTIONS = [
  { value: "client", label: "Client" },
  { value: "team_member", label: "Team Member" },
  { value: "admin", label: "Admin" },
] as const;

// ── Create User Dialog ──────────────────────────────────────────────

export function CreateUserDialog({ children, isAdmin = false }: { children: React.ReactNode; isAdmin?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string>("client");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const result = await createUser({
      firstName: fd.get("firstName") as string,
      lastName: fd.get("lastName") as string,
      email: fd.get("email") as string,
      password: fd.get("password") as string,
      role: role as "admin" | "team_member" | "client",
    });

    if (result.success) {
      toast.success("User created");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Add a new user account. They&apos;ll receive a welcome email from
              Clerk.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cu-first">First Name *</Label>
                <Input id="cu-first" name="firstName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cu-last">Last Name *</Label>
                <Input id="cu-last" name="lastName" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cu-email">Email *</Label>
              <Input id="cu-email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cu-password">Password *</Label>
              <Input
                id="cu-password"
                name="password"
                type="password"
                minLength={8}
                required
              />
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.filter((r) => isAdmin || r.value !== "admin").map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit User Dialog ────────────────────────────────────────────────

type EditUserDialogProps = {
  user: ClerkUserInfo;
  children: React.ReactNode;
  isAdmin?: boolean;
};

export function EditUserDialog({ user, children, isAdmin = false }: EditUserDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Split display name into first/last
  const nameParts = user.name.split(" ");
  const defaultFirst = nameParts[0] ?? "";
  const defaultLast = nameParts.slice(1).join(" ") || "";

  const [role, setRole] = useState<string>(user.role);
  const [tags, setTags] = useState<string[]>(user.tags);
  const [tagInput, setTagInput] = useState("");

  // ── Client Access state ──────────────────────────────────────────
  // "new:" prefix on contactId means it hasn't been saved yet
  const [clientLinks, setClientLinks] = useState(user.linkedClients);
  const [removedContactIds, setRemovedContactIds] = useState<string[]>([]);
  const [availableClients, setAvailableClients] = useState<{ id: string; name: string }[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  async function loadAvailableClients() {
    setClientsLoading(true);
    const result = await listAllClients();
    if (result.success) {
      const linkedIds = new Set(clientLinks.map((l) => l.clientId));
      setAvailableClients(result.data.filter((c) => !linkedIds.has(c.id)));
    }
    setClientsLoading(false);
  }

  // Re-sync clientLinks when the user prop changes (e.g. after revalidation)
  useEffect(() => {
    setClientLinks(user.linkedClients);
  }, [user.linkedClients]);

  // All changes are local-only until the user clicks "Update"
  function handleAddClient(clientId: string) {
    const client = availableClients.find((c) => c.id === clientId);
    if (!client) return;

    setClientLinks((prev) => [
      ...prev,
      {
        contactId: `new:${clientId}`,
        clientId: client.id,
        clientName: client.name,
        roleLabel: null,
        canDashboard: true,
        canBilling: true,
        canAnalytics: true,
        canUptime: true,
        canSupport: true,
        canSiteHealth: true,
      },
    ]);
    setAvailableClients((prev) => prev.filter((c) => c.id !== clientId));
  }

  function handleRemoveClient(contactId: string) {
    const link = clientLinks.find((l) => l.contactId === contactId);
    setClientLinks((prev) => prev.filter((l) => l.contactId !== contactId));
    // Track existing links that need server-side deletion
    if (!contactId.startsWith("new:")) {
      setRemovedContactIds((prev) => [...prev, contactId]);
    }
    if (link) {
      setAvailableClients((prev) =>
        [...prev, { id: link.clientId, name: link.clientName }].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
    }
  }

  function handleUpdateContact(contactId: string, key: string, value: unknown) {
    setClientLinks((prev) =>
      prev.map((l) =>
        l.contactId === contactId ? { ...l, [key]: value } : l
      )
    );
  }

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

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
          loadAvailableClients();
        } else {
          // Refresh table data after dialog closes (client links may have changed)
          router.refresh();
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);

            const fd = new FormData(e.currentTarget);

            // 1. Save new client links
            const newLinks = clientLinks.filter((l) => l.contactId.startsWith("new:"));
            const addResults = await Promise.all(
              newLinks.map((l) =>
                addClientContact(l.clientId, {
                  clerkUserId: user.id,
                  roleLabel: l.roleLabel ?? undefined,
                  canDashboard: l.canDashboard,
                  canBilling: l.canBilling,
                  canAnalytics: l.canAnalytics,
                  canUptime: l.canUptime,
                  canSupport: l.canSupport,
                  canSiteHealth: l.canSiteHealth,
                })
              )
            );
            const addFailed = addResults.find((r) => !r.success);
            if (addFailed && !addFailed.success) {
              toast.error(addFailed.error);
              setLoading(false);
              return;
            }

            // 2. Update existing client links (permissions/role label changes)
            const existingLinks = clientLinks.filter(
              (l) => !l.contactId.startsWith("new:")
            );
            const originalMap = new Map(
              user.linkedClients.map((l) => [l.contactId, l])
            );
            await Promise.all(
              existingLinks
                .filter((l) => {
                  const orig = originalMap.get(l.contactId);
                  if (!orig) return false;
                  return (
                    orig.roleLabel !== l.roleLabel ||
                    orig.canDashboard !== l.canDashboard ||
                    orig.canBilling !== l.canBilling ||
                    orig.canAnalytics !== l.canAnalytics ||
                    orig.canUptime !== l.canUptime ||
                    orig.canSupport !== l.canSupport ||
                    orig.canSiteHealth !== l.canSiteHealth
                  );
                })
                .map((l) =>
                  updateClientContact(l.contactId, {
                    roleLabel: l.roleLabel ?? undefined,
                    canDashboard: l.canDashboard,
                    canBilling: l.canBilling,
                    canAnalytics: l.canAnalytics,
                    canUptime: l.canUptime,
                    canSupport: l.canSupport,
                    canSiteHealth: l.canSiteHealth,
                  })
                )
            );

            // 3. Remove deleted links
            await Promise.all(
              removedContactIds.map((id) => removeClientContact(id))
            );

            // 4. Save user details + tags
            const [result] = await Promise.all([
              updateUser(user.id, {
                firstName: fd.get("firstName") as string,
                lastName: fd.get("lastName") as string,
                role: role as "admin" | "team_member" | "client",
              }),
              setUserTags(user.id, tags),
            ]);

            if (result.success) {
              toast.success("User updated");
              setOpen(false);
              router.refresh();
            } else {
              toast.error(result.error);
            }
            setLoading(false);
            setRemovedContactIds([]);
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update {user.name}&apos;s details. Email changes require the Clerk
              dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eu-first">First Name *</Label>
                <Input
                  id="eu-first"
                  name="firstName"
                  defaultValue={defaultFirst}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eu-last">Last Name *</Label>
                <Input
                  id="eu-last"
                  name="lastName"
                  defaultValue={defaultLast}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} disabled />
              <p className="text-xs text-muted-foreground">
                Email can only be changed in the Clerk dashboard.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              {isAdmin ? (
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role} disabled />
              )}
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
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
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag} disabled={!tagInput.trim()}>
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
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
            </div>

            {/* ── Client Access ── */}
            <div className="space-y-3">
              <Label>Client Access</Label>

              {/* List of linked clients */}
              {clientLinks.map((link) => (
                <div key={link.contactId} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{link.clientName}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveClient(link.contactId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Input
                      placeholder="Role label (e.g. Developer)"
                      defaultValue={link.roleLabel ?? ""}
                      className="h-8 text-sm"
                      onBlur={(e) =>
                        handleUpdateContact(link.contactId, "roleLabel", e.target.value)
                      }
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {ALL_PERMISSIONS.map((perm) => {
                      const key = `can${perm.charAt(0).toUpperCase() + perm.slice(1)}` as keyof typeof link;
                      return (
                        <label key={perm} className="flex items-center gap-1.5 text-xs">
                          <Checkbox
                            checked={link[key] as boolean}
                            onCheckedChange={(checked) => {
                              handleUpdateContact(link.contactId, key, !!checked);
                            }}
                          />
                          {PERMISSION_LABELS[perm]}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Add client picker */}
              <div className="flex gap-2">
                <Select onValueChange={handleAddClient}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Link a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                    {availableClients.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {clientsLoading ? "Loading..." : "No clients available"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

