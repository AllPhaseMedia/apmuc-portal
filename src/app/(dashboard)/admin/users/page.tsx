import { requireStaff, getAuthUser } from "@/lib/auth";
import { listClerkUsers } from "@/actions/admin/impersonate";
import { listTags } from "@/actions/admin/tags";
import { Button } from "@/components/ui/button";
import { CreateUserDialog } from "@/components/admin/user-dialogs";
import { UsersTable } from "@/components/admin/users-table";
import { Plus } from "lucide-react";

export default async function AdminUsersPage() {
  await requireStaff();
  const currentUser = await getAuthUser();
  const [users, allTags] = await Promise.all([listClerkUsers(), listTags()]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and roles.
          </p>
        </div>
        <CreateUserDialog isAdmin={currentUser?.isAdmin ?? false}>
          <Button>
            <Plus className="h-4 w-4 mr-1.5" />
            Create User
          </Button>
        </CreateUserDialog>
      </div>

      <UsersTable
        users={users}
        allTags={allTags}
        currentClerkUserId={currentUser?.clerkUserId ?? ""}
        isAdmin={currentUser?.isAdmin ?? false}
      />
    </div>
  );
}
