"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ClerkUserInfo } from "@/actions/admin/impersonate";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { EditUserDialog } from "@/components/admin/user-dialogs";
import { UserTags } from "@/components/admin/user-tags";
import {
  ArrowUpDown,
  CreditCard,
  Eye,
  MoreHorizontal,
  Pencil,
  ShieldBan,
  ShieldCheck,
  Trash2,
} from "lucide-react";

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

export type ColumnOptions = {
  currentClerkUserId: string;
  isAdmin: boolean;
  allTags: string[];
  onDelete: (user: ClerkUserInfo) => void;
  onImpersonate: (user: ClerkUserInfo) => void;
  onToggleStatus: (user: ClerkUserInfo) => void;
};

function SortableHeader({
  label,
  column,
}: {
  label: string;
  column: { toggleSorting: (desc?: boolean) => void };
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting()}
    >
      {label}
      <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
    </Button>
  );
}

export function getUserColumns(opts: ColumnOptions): ColumnDef<ClerkUserInfo>[] {
  return [
    // ── User ──────────────────────────────────────────────────────
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader label="User" column={column} />,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.imageUrl} />
              <AvatarFallback>
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        );
      },
    },

    // ── Role ──────────────────────────────────────────────────────
    {
      accessorKey: "role",
      header: ({ column }) => <SortableHeader label="Role" column={column} />,
      cell: ({ row }) => {
        const role = row.getValue<string>("role");
        return (
          <Badge variant={ROLE_VARIANT[role] ?? "outline"}>
            {ROLE_LABELS[role] ?? role}
          </Badge>
        );
      },
      filterFn: (row, _columnId, filterValue: string) => {
        if (!filterValue || filterValue === "all") return true;
        return row.getValue<string>("role") === filterValue;
      },
    },

    // ── Tags ──────────────────────────────────────────────────────
    {
      id: "tags",
      header: "Tags",
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <UserTags
            userId={user.id}
            tags={user.tags}
            allTags={opts.allTags}
          />
        );
      },
    },

    // ── Stripe ────────────────────────────────────────────────────
    {
      accessorKey: "isStripeCustomer",
      header: ({ column }) => (
        <SortableHeader label="Stripe" column={column} />
      ),
      cell: ({ row }) => {
        const isCustomer = row.getValue<boolean>("isStripeCustomer");
        if (isCustomer) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CreditCard className="h-4 w-4 text-orange-500" />
                </TooltipTrigger>
                <TooltipContent>Stripe customer</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return <span className="text-xs text-muted-foreground">&mdash;</span>;
      },
      filterFn: (row, _columnId, filterValue: string) => {
        if (!filterValue || filterValue === "all") return true;
        const isCustomer = row.getValue<boolean>("isStripeCustomer");
        return filterValue === "yes" ? isCustomer : !isCustomer;
      },
    },

    // ── Linked Clients ────────────────────────────────────────────
    {
      id: "linkedClients",
      accessorFn: (row) => row.linkedClients.length,
      header: ({ column }) => (
        <SortableHeader label="Linked Clients" column={column} />
      ),
      cell: ({ row }) => {
        const clients = row.original.linkedClients;
        if (clients.length === 0) {
          return <span className="text-xs text-muted-foreground">&mdash;</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {clients.map((c) => (
              <Badge key={c.id} variant="secondary" className="text-xs">
                {c.name}
              </Badge>
            ))}
          </div>
        );
      },
    },

    // ── Status ────────────────────────────────────────────────────
    {
      accessorKey: "status",
      header: ({ column }) => (
        <SortableHeader label="Status" column={column} />
      ),
      cell: ({ row }) => {
        const status = row.getValue<string>("status");
        return status === "active" ? (
          <Badge variant="outline" className="border-green-500 text-green-600">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="border-red-500 text-red-600">
            Suspended
          </Badge>
        );
      },
      filterFn: (row, _columnId, filterValue: string) => {
        if (!filterValue || filterValue === "all") return true;
        return row.getValue<string>("status") === filterValue;
      },
    },

    // ── Last Sign In ──────────────────────────────────────────────
    {
      accessorKey: "lastSignInAt",
      header: ({ column }) => (
        <SortableHeader label="Last Sign In" column={column} />
      ),
      cell: ({ row }) => {
        const ts = row.getValue<number | null>("lastSignInAt");
        return (
          <span className="text-muted-foreground">
            {ts ? format(new Date(ts), "MMM d, yyyy") : "Never"}
          </span>
        );
      },
    },

    // ── Actions ───────────────────────────────────────────────────
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
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Edit — wraps the menu item with EditUserDialog */}
              <EditUserDialog user={user} isAdmin={opts.isAdmin}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              </EditUserDialog>

              {/* Impersonate — admin only, not self */}
              {opts.isAdmin && !isSelf && (
                <DropdownMenuItem
                  onSelect={() => opts.onImpersonate(user)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Impersonate
                </DropdownMenuItem>
              )}

              {/* Suspend / Activate — not self */}
              {!isSelf && (
                <DropdownMenuItem
                  onSelect={() => opts.onToggleStatus(user)}
                >
                  {user.status === "active" ? (
                    <>
                      <ShieldBan className="mr-2 h-4 w-4" />
                      Suspend
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
              )}

              {/* Delete — not self, destructive */}
              {!isSelf && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => opts.onDelete(user)}
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
