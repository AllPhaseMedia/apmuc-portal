"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { ClientContact } from "@prisma/client";
import {
  addClientContact,
  updateClientContact,
  removeClientContact,
  type ContactFormValues,
} from "@/actions/admin/contacts";
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
import { Plus, Pencil, Trash2, UserPlus, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  clientId: string;
  contacts: ClientContact[];
};

const PERM_FIELD_MAP: Record<ContactPermission, keyof ContactFormValues> = {
  dashboard: "canDashboard",
  billing: "canBilling",
  analytics: "canAnalytics",
  uptime: "canUptime",
  support: "canSupport",
  siteHealth: "canSiteHealth",
};

function getDefaultValues(): ContactFormValues {
  return {
    email: "",
    name: "",
    roleLabel: "",
    canDashboard: true,
    canBilling: true,
    canAnalytics: true,
    canUptime: true,
    canSupport: true,
    canSiteHealth: true,
    isActive: true,
  };
}

function contactToValues(contact: ClientContact): ContactFormValues {
  return {
    email: contact.email,
    name: contact.name,
    roleLabel: contact.roleLabel ?? "",
    canDashboard: contact.canDashboard,
    canBilling: contact.canBilling,
    canAnalytics: contact.canAnalytics,
    canUptime: contact.canUptime,
    canSupport: contact.canSupport,
    canSiteHealth: contact.canSiteHealth,
    isActive: contact.isActive,
  };
}

function PermissionBadges({ contact }: { contact: ClientContact }) {
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

function ContactForm({
  clientId,
  contact,
  onClose,
}: {
  clientId: string;
  contact?: ClientContact;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<ContactFormValues>(
    contact ? contactToValues(contact) : getDefaultValues()
  );

  function setField<K extends keyof ContactFormValues>(key: K, val: ContactFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = contact
      ? await updateClientContact(contact.id, values)
      : await addClientContact(clientId, values);

    if (result.success) {
      toast.success(contact ? "Contact updated" : "Contact added");
      router.refresh();
      onClose();
    } else {
      toast.error(result.error);
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name">Name *</Label>
          <Input
            id="contact-name"
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">Email *</Label>
          <Input
            id="contact-email"
            type="email"
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="contact-role">Role Label</Label>
          <Input
            id="contact-role"
            value={values.roleLabel ?? ""}
            onChange={(e) => setField("roleLabel", e.target.value)}
            placeholder="e.g., Developer, Billing Manager"
          />
        </div>
      </div>

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
                  checked={values[fieldKey] as boolean}
                  onCheckedChange={(checked) => setField(fieldKey, checked)}
                />
                <Label className="font-normal">{PERMISSION_LABELS[perm]}</Label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={values.isActive}
          onCheckedChange={(checked) => setField("isActive", checked)}
        />
        <Label>Active</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : contact ? "Update" : "Add Contact"}
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
          Additional Contacts
        </CardTitle>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
            </DialogHeader>
            <ContactForm
              clientId={clientId}
              onClose={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No additional contacts. Add team members who need portal access.
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
                      {contact.clerkUserId && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          Linked
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
                        <ContactForm
                          clientId={clientId}
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
