import { requireAdmin } from "@/lib/auth";
import { listClerkUsers } from "@/actions/admin/impersonate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ImpersonateButton } from "@/components/admin/impersonate-button";
import { RoleSelect } from "@/components/admin/role-select";
import {
  CreateUserDialog,
  EditUserDialog,
  DeleteUserButton,
} from "@/components/admin/user-dialogs";
import { format } from "date-fns";
import { Plus, Pencil, Trash2 } from "lucide-react";

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  team_member: "secondary",
  client: "outline",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  team_member: "Team Member",
  client: "Client",
};

export default async function AdminUsersPage() {
  const currentUser = await requireAdmin();
  const users = await listClerkUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and impersonation.
          </p>
        </div>
        <CreateUserDialog>
          <Button>
            <Plus className="h-4 w-4 mr-1.5" />
            Create User
          </Button>
        </CreateUserDialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Linked Clients</TableHead>
              <TableHead>Last Sign In</TableHead>
              <TableHead className="w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.imageUrl} />
                      <AvatarFallback>
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <RoleSelect
                    userId={user.id}
                    currentRole={user.role}
                    isCurrentUser={user.id === currentUser.clerkUserId}
                  />
                </TableCell>
                <TableCell>
                  {user.linkedClients.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.linkedClients.map((c) => (
                        <Badge
                          key={c.id}
                          variant={c.isPrimary ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {c.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.lastSignInAt
                    ? format(new Date(user.lastSignInAt), "MMM d, yyyy")
                    : "Never"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <EditUserDialog user={user}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </EditUserDialog>
                    {user.id !== currentUser.clerkUserId && (
                      <>
                        <DeleteUserButton
                          userId={user.id}
                          userName={user.name}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DeleteUserButton>
                        <ImpersonateButton
                          userId={user.id}
                          userName={user.name}
                        />
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
