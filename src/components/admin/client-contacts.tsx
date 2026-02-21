"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { ClientContact } from "@prisma/client";
import {
  addClientContact,
  updateClientContact,
  removeClientContact,
  listAvailableUsers,
  type AddContactValues,
  type UpdateContactValues,
} from "@/actions/admin/contacts";
import type { ClerkUserInfo } from "@/actions/admin/impersonate";
import { ALL_PERMISSIONS, PERMISSION_LABELS, type ContactPermission } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Plus, Pencil, Trash2, UserPlus, Shield, Check, ChevronsUpDown, Crown } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = {
  clientId: string;
  contacts: ClientContact[];
};

const PERM_FIELD_MAP: Record<ContactPermission, keyof AddContactValues> = {
  dashboard: "canDashboard",
  billing: "canBilling",
  analytics: "canAnalytics",
  uptime: "canUptime",
  support: "canSupport",
  siteHealth: "canSiteHealth",
};

function PermissionBadges({ contact }: { contact: ClientContact }) {
  if (contact.isPrimary) {
    return (
      <Badge variant="default" className="text-xs">
        All Permissions (Primary)
      </Badge>
    );
  }

  const permMap: Record<ContactPermission, boolean> = {
    dashboard: contact.canDashboard,
    billing: contact.canBilling,
    analytics: contact.canAnalytics,
    uptime: contact.canUptime,
    support: contact.canSupport,
    siteHealth: contact.canSiteHealth,
  };

  return (
    <div className="flex flex-wrap gap-1">
      {ALL_PERMISSIONS.map((perm) => (
        <Badge
          key={perm}
          variant={permMap[perm] ? "default" : "outline"}
          className="text-xs"
        >
          {PERMISSION_LABELS[perm]}
        </Badge>
      ))}
    </div>
  );
}

function UserPicker({
  clientId,
  selectedUser,
  onSelect,
}: {
  clientId: string;
  selectedUser: ClerkUserInfo | null;
  onSelect: (user: ClerkUserInfo | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<ClerkUserInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && users.length === 0) {
      setLoading(true);
      listAvailableUsers(clientId).then((result) => {
        if (result.success) {
          setUsers(result.data);
        }
        setLoading(false);
      });
    }
  }, [open, clientId, users.length]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedUser
            ? `${selectedUser.name} (${selectedUser.email})`
            : "Select a user..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search users..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading users..." : "No users found."}
            </CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`${user.name} ${user.email}`}
                  onSelect={() => {
                    onSelect(user);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedUser?.id === user.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function AddContactForm({
  clientId,
  onClose,
}: {
  clientId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ClerkUserInfo | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [roleLabel, setRoleLabel] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    canDashboard: true,
    canBilling: true,
    canAnalytics: true,
    canUptime: true,
    canSupport: true,
    canSiteHealth: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }
    setLoading(true);

    const values: AddContactValues = {
      clerkUserId: selectedUser.id,
      isPrimary,
      roleLabel,
      ...permissions,
    } as AddContactValues;

    const result = await addClientContact(clientId, values);

    if (result.success) {
      toast.success("Contact added");
      router.refresh();
      onClose();
    } else {
      toast.error(result.error);
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>User *</Label>
        <UserPicker
          clientId={clientId}
          selectedUser={selectedUser}
          onSelect={setSelectedUser}
        />
        {selectedUser && (
          <p className="text-sm text-muted-foreground">
            Will be linked as {selectedUser.name} ({selectedUser.email})
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-role">Role Label</Label>
        <Input
          id="contact-role"
          value={roleLabel}
          onChange={(e) => setRoleLabel(e.target.value)}
          placeholder="e.g., Developer, Billing Manager"
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={isPrimary}
          onCheckedChange={setIsPrimary}
        />
        <Label className="flex items-center gap-1">
          <Crown className="h-4 w-4" /> Primary Contact
        </Label>
        <span className="text-xs text-muted-foreground">(full permissions)</span>
      </div>

      {!isPrimary && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Permissions
          </Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {ALL_PERMISSIONS.map((perm) => {
              const fieldKey = PERM_FIELD_MAP[perm];
              return (
                <div key={perm} className="flex items-center gap-2">
                  <Switch
                    checked={permissions[fieldKey] as boolean}
                    onCheckedChange={(checked) =>
                      setPermissions((prev) => ({ ...prev, [fieldKey]: checked }))
                    }
                  />
                  <Label className="font-normal">{PERMISSION_LABELS[perm]}</Label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !selectedUser}>
          {loading ? "Adding..." : "Add Contact"}
        </Button>
      </div>
    </form>
  );
}

function EditContactForm({
  contact,
  onClose,
}: {
  contact: ClientContact;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isPrimary, setIsPrimary] = useState(contact.isPrimary);
  const [roleLabel, setRoleLabel] = useState(contact.roleLabel ?? "");
  const [isActive, setIsActive] = useState(contact.isActive);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    canDashboard: contact.canDashboard,
    canBilling: contact.canBilling,
    canAnalytics: contact.canAnalytics,
    canUptime: contact.canUptime,
    canSupport: contact.canSupport,
    canSiteHealth: contact.canSiteHealth,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const values: UpdateContactValues = {
      isPrimary,
      roleLabel,
      isActive,
      ...permissions,
    };

    const result = await updateClientContact(contact.id, values);

    if (result.success) {
      toast.success("Contact updated");
      router.refresh();
      onClose();
    } else {
      toast.error(result.error);
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border p-3 bg-muted/50">
        <p className="font-medium">{contact.name}</p>
        <p className="text-sm text-muted-foreground">{contact.email}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-role">Role Label</Label>
        <Input
          id="edit-role"
          value={roleLabel}
          onChange={(e) => setRoleLabel(e.target.value)}
          placeholder="e.g., Developer, Billing Manager"
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
        <Label className="flex items-center gap-1">
          <Crown className="h-4 w-4" /> Primary Contact
        </Label>
        <span className="text-xs text-muted-foreground">(full permissions)</span>
      </div>

      {!isPrimary && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Permissions
          </Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {ALL_PERMISSIONS.map((perm) => {
              const fieldKey = PERM_FIELD_MAP[perm];
              return (
                <div key={perm} className="flex items-center gap-2">
                  <Switch
                    checked={permissions[fieldKey] as boolean}
                    onCheckedChange={(checked) =>
                      setPermissions((prev) => ({ ...prev, [fieldKey]: checked }))
                    }
                  />
                  <Label className="font-normal">{PERMISSION_LABELS[perm]}</Label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Switch checked={isActive} onCheckedChange={setIsActive} />
        <Label>Active</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Update"}
        </Button>
      </div>
    </form>
  );
}

export function ClientContacts({ clientId, contacts }: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleRemove(contactId: string) {
    setRemoving(contactId);
    const result = await removeClientContact(contactId);
    if (result.success) {
      toast.success("Contact removed");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setRemoving(null);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Linked Users
        </CardTitle>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Link User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Link User to Client</DialogTitle>
            </DialogHeader>
            <AddContactForm
              clientId={clientId}
              onClose={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No linked users. Link Clerk users who need portal access.
          </p>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex flex-col gap-2 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{contact.name}</span>
                      {contact.isPrimary && (
                        <Badge variant="default" className="text-xs bg-amber-600">
                          <Crown className="mr-1 h-3 w-3" />
                          Primary
                        </Badge>
                      )}
                      {contact.roleLabel && (
                        <Badge variant="secondary" className="text-xs">
                          {contact.roleLabel}
                        </Badge>
                      )}
                      {!contact.isActive && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{contact.email}</p>
                  </div>
                  <div className="flex gap-1">
                    <Dialog
                      open={editingId === contact.id}
                      onOpenChange={(open) => setEditingId(open ? contact.id : null)}
                    >
                      <DialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Edit Contact</DialogTitle>
                        </DialogHeader>
                        <EditContactForm
                          contact={contact}
                          onClose={() => setEditingId(null)}
                        />
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Contact</AlertDialogTitle>
                          <AlertDialogDescription>
                            Remove {contact.name} ({contact.email}) from this client?
                            This will revoke their portal access.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemove(contact.id)}
                            disabled={removing === contact.id}
                          >
                            {removing === contact.id ? "Removing..." : "Remove"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <PermissionBadges contact={contact} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
