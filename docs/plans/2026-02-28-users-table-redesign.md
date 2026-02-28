# Users Table Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the admin users table with TanStack React Table — sortable columns, pagination, comprehensive filters, 3-dot actions menu, and user suspend/activate.

**Architecture:** Replace the hand-rolled `UsersTable` component with a TanStack React Table powered data table. Add `status` field to `ClerkUserInfo` from Clerk metadata. All filtering, sorting, and pagination happen client-side since data is already fully loaded. New `setUserStatus` server action handles suspend/activate via Clerk ban API.

**Tech Stack:** @tanstack/react-table, shadcn/ui (Table, DropdownMenu, Select, Popover, Badge), Clerk ban/unban API

---

### Task 1: Install TanStack React Table

**Files:**
- Modify: `package.json`

**Step 1: Install the dependency**

Run: `npm install @tanstack/react-table`

**Step 2: Verify installation**

Run: `grep tanstack package.json`
Expected: `"@tanstack/react-table": "^8.x.x"`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @tanstack/react-table dependency"
```

---

### Task 2: Add status field to ClerkUserInfo and server action

**Files:**
- Modify: `src/actions/admin/impersonate.ts` — add `status` to type + read from metadata
- Modify: `src/actions/admin/users.ts` — add `setUserStatus` action

**Step 1: Update ClerkUserInfo type and listClerkUsers**

In `src/actions/admin/impersonate.ts`, add `status` to the `ClerkUserInfo` type:

```typescript
export type ClerkUserInfo = {
  id: string;
  email: string;
  name: string;
  role: string;
  tags: string[];
  imageUrl: string;
  lastSignInAt: number | null;
  linkedClients: { id: string; name: string }[];
  isStripeCustomer: boolean;
  status: "active" | "suspended";
};
```

In the `listClerkUsers` return mapping, read status from metadata:

```typescript
status: (meta?.status as string) === "suspended" ? "suspended" : "active",
```

**Step 2: Add setUserStatus server action**

In `src/actions/admin/users.ts`, add:

```typescript
export async function setUserStatus(
  clerkUserId: string,
  status: "active" | "suspended"
): Promise<ActionResult<null>> {
  try {
    await requireStaff();
    const currentUser = await getAuthUser();

    if (clerkUserId === currentUser?.clerkUserId) {
      return { success: false, error: "You cannot change your own status" };
    }

    const clerk = await clerkClient();

    if (status === "suspended") {
      await clerk.users.banUser(clerkUserId);
      await clerk.users.updateUserMetadata(clerkUserId, {
        publicMetadata: { status: "suspended" },
      });
    } else {
      await clerk.users.unbanUser(clerkUserId);
      await clerk.users.updateUserMetadata(clerkUserId, {
        publicMetadata: { status: undefined },
      });
    }

    revalidatePath("/admin/users");
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update status",
    };
  }
}
```

**Step 3: Build and verify**

Run: `npm run build`
Expected: Compiles successfully

**Step 4: Commit**

```bash
git add src/actions/admin/impersonate.ts src/actions/admin/users.ts
git commit -m "feat: add user status field and setUserStatus server action"
```

---

### Task 3: Create the data table column definitions

**Files:**
- Create: `src/components/admin/users-table-columns.tsx`

This file defines all TanStack column definitions for the users table. It is a `"use client"` file that exports a function `getUserColumns(opts)` returning `ColumnDef<ClerkUserInfo>[]`.

**Step 1: Create column definitions file**

```typescript
"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { ClerkUserInfo } from "@/actions/admin/impersonate";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserTags } from "@/components/admin/user-tags";
import {
  ArrowUpDown,
  CreditCard,
  MoreHorizontal,
  Pencil,
  Eye,
  Ban,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

type ColumnOptions = {
  currentClerkUserId: string;
  isAdmin: boolean;
  allTags: string[];
  onEdit: (user: ClerkUserInfo) => void;
  onDelete: (user: ClerkUserInfo) => void;
  onImpersonate: (user: ClerkUserInfo) => void;
  onToggleStatus: (user: ClerkUserInfo) => void;
};

export function getUserColumns(opts: ColumnOptions): ColumnDef<ClerkUserInfo>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          User
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.imageUrl} />
              <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Role
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const role = row.getValue("role") as string;
        const variant = role === "admin" ? "default" : role === "team_member" ? "secondary" : "outline";
        const label = role === "team_member" ? "Team Member" : role.charAt(0).toUpperCase() + role.slice(1);
        return <Badge variant={variant}>{label}</Badge>;
      },
      filterFn: (row, id, value) => value === "all" || row.getValue(id) === value,
    },
    {
      id: "tags",
      header: "Tags",
      cell: ({ row }) => (
        <UserTags
          userId={row.original.id}
          tags={row.original.tags}
          allTags={opts.allTags}
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "isStripeCustomer",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Stripe
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) =>
        row.original.isStripeCustomer ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <CreditCard className="h-4 w-4 text-orange-500" />
              </TooltipTrigger>
              <TooltipContent>Stripe customer</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
      filterFn: (row, id, value) => {
        if (value === "all") return true;
        return value === "yes" ? row.original.isStripeCustomer : !row.original.isStripeCustomer;
      },
    },
    {
      id: "linkedClients",
      accessorFn: (row) => row.linkedClients.length,
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Linked Clients
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const clients = row.original.linkedClients;
        return clients.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {clients.map((c) => (
              <Badge key={c.id} variant="secondary" className="text-xs">{c.name}</Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return status === "suspended" ? (
          <Badge variant="destructive">Suspended</Badge>
        ) : (
          <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
        );
      },
      filterFn: (row, id, value) => value === "all" || row.getValue(id) === value,
    },
    {
      accessorKey: "lastSignInAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Last Sign In
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const val = row.getValue("lastSignInAt") as number | null;
        return (
          <span className="text-muted-foreground">
            {val ? format(new Date(val), "MMM d, yyyy") : "Never"}
          </span>
        );
      },
    },
    {
      id: "actions",
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original;
        const isSelf = user.id === opts.currentClerkUserId;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => opts.onEdit(user)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {opts.isAdmin && !isSelf && (
                <DropdownMenuItem onClick={() => opts.onImpersonate(user)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Impersonate
                </DropdownMenuItem>
              )}
              {!isSelf && (
                <DropdownMenuItem onClick={() => opts.onToggleStatus(user)}>
                  {user.status === "suspended" ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Activate
                    </>
                  ) : (
                    <>
                      <Ban className="mr-2 h-4 w-4" />
                      Suspend
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {!isSelf && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => opts.onDelete(user)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
```

**Step 2: Build and verify**

Run: `npm run build`
Expected: Compiles (component not yet wired up, but no errors since it's just an export)

**Step 3: Commit**

```bash
git add src/components/admin/users-table-columns.tsx
git commit -m "feat: add TanStack column definitions for users table"
```

---

### Task 4: Rewrite UsersTable with TanStack React Table

**Files:**
- Rewrite: `src/components/admin/users-table.tsx`

Replace the entire component with TanStack-powered table including:
- Filter toolbar (search, role, tags, stripe, status dropdowns)
- Data table with sorting
- Pagination footer with page size selector (50/100/200)
- Dialog state management for edit/delete/suspend actions

The component uses `useReactTable` with `getCoreRowModel`, `getFilteredRowModel`, `getSortedRowModel`, `getPaginationRowModel`. Column filters for role, status, and stripe are set via the toolbar dropdowns. The global filter handles text search. Tags filtering uses a custom `filterFn` on the data before passing to the table.

**Key details:**
- Status filter defaults to `"active"` (hides suspended users on load)
- Search filters across name + email using TanStack global filter
- Tags filter remains as multi-select popover checkbox list (same UX as before)
- Edit and Delete open the existing `EditUserDialog` / `DeleteUserButton` dialogs via controlled state
- Suspend triggers a confirmation `AlertDialog` then calls `setUserStatus`
- Impersonate calls `startImpersonation` then navigates to `/dashboard`
- Page size options: 50, 100, 200 — default 50
- Pagination shows: "Showing X–Y of Z users" and prev/next buttons

**Step 1: Rewrite the component**

Write the full new `UsersTable` to `src/components/admin/users-table.tsx`. The component signature stays the same (`Props` type with `users`, `allTags`, `currentClerkUserId`, `isAdmin`).

Import `getUserColumns` from `./users-table-columns`. Use `useState` for `sorting`, `columnFilters`, `globalFilter`, `pagination` (pageSize: 50). Wire up toolbar dropdowns to `column.setFilterValue()`. Wire action callbacks to dialog state. Render table body from `table.getRowModel().rows`.

For the suspend confirmation, use shadcn `AlertDialog` inline in the component (not a separate file).

**Step 2: Update the page component if needed**

The page at `src/app/(dashboard)/admin/users/page.tsx` should not need changes — it already passes `users`, `allTags`, `currentClerkUserId`, `isAdmin` to `UsersTable`.

**Step 3: Build and verify**

Run: `npm run build`
Expected: Compiles successfully

**Step 4: Manual test**

Run: `npm run dev` and visit `/admin/users`
Verify:
- Table renders all users
- Sorting works on all sortable columns
- Status filter defaults to Active (suspended users hidden)
- Each filter works (role, stripe, tags, search)
- Pagination works with page size switching
- 3-dot menu shows correct actions
- Edit opens dialog
- Suspend shows confirmation then suspends
- Delete shows confirmation then deletes

**Step 5: Commit**

```bash
git add src/components/admin/users-table.tsx
git commit -m "feat: rewrite users table with TanStack React Table"
```

---

### Task 5: Clean up unused components

**Files:**
- Modify: `src/components/admin/role-select.tsx` — check if still used elsewhere, if not, remove
- Modify: `src/components/admin/impersonate-button.tsx` — check if still used elsewhere, if not, remove

**Step 1: Check for other usages**

Search for imports of `RoleSelect` and `ImpersonateButton` outside of `users-table.tsx`. If they're only used in the old users table, they can be removed since the new table handles roles via the edit dialog and impersonation via the actions menu.

**Step 2: Remove if unused**

Delete the files if no other imports exist.

**Step 3: Build and verify**

Run: `npm run build`
Expected: Compiles successfully with no unused import errors

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove unused RoleSelect and ImpersonateButton components"
```

---

### Task 6: Final build and push

**Step 1: Full build**

Run: `npm run build`
Expected: Clean compile

**Step 2: Push**

```bash
git push
```
