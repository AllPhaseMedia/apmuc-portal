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
import { ImpersonateButton } from "@/components/admin/impersonate-button";
import { RoleSelect } from "@/components/admin/role-select";
import { format } from "date-fns";

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Manage user roles and impersonate users.
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
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
                <TableCell className="text-muted-foreground">
                  {user.lastSignInAt
                    ? format(new Date(user.lastSignInAt), "MMM d, yyyy")
                    : "Never"}
                </TableCell>
                <TableCell>
                  {user.id !== currentUser.clerkUserId && (
                    <ImpersonateButton
                      userId={user.id}
                      userName={user.name}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
