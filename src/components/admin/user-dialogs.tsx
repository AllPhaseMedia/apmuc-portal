"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import type { ClerkUserInfo } from "@/actions/admin/impersonate";
import { setUserTags } from "@/actions/admin/impersonate";
import {
  createUser,
  updateUser,
  deleteUser,
} from "@/actions/admin/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);

            const fd = new FormData(e.currentTarget);
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
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update {user.name}&apos;s details. Email changes require the Clerk
              dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
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

// ── Delete User Button ──────────────────────────────────────────────

type DeleteUserButtonProps = {
  userId: string;
  userName: string;
  children: React.ReactNode;
};

export function DeleteUserButton({
  userId,
  userName,
  children,
}: DeleteUserButtonProps) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteUser(userId);
    setDeleting(false);

    if (result.success) {
      toast.success("User deleted");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{userName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the user account and remove all their
            portal client links. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={deleting}>
            {deleting && (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
