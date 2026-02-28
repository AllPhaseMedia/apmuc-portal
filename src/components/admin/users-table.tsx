"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
} from "@tanstack/react-table";
import type { ClerkUserInfo } from "@/actions/admin/impersonate";
import { startImpersonation } from "@/actions/admin/impersonate";
import { setUserStatus, deleteUser } from "@/actions/admin/users";
import { getUserColumns } from "@/components/admin/users-table-columns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Search,
  X,
} from "lucide-react";

type Props = {
  users: ClerkUserInfo[];
  allTags: string[];
  currentClerkUserId: string;
  isAdmin?: boolean;
};

export function UsersTable({
  users,
  allTags,
  currentClerkUserId,
  isAdmin = false,
}: Props) {
  const router = useRouter();

  // ── Tag filter (pre-filter before table) ───────────────────────
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filteredByTags = useMemo(() => {
    if (selectedTags.length === 0) return users;
    return users.filter((user) =>
      selectedTags.some((tag) => user.tags.includes(tag))
    );
  }, [users, selectedTags]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  // ── Dialog state ───────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<ClerkUserInfo | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<ClerkUserInfo | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState(false);

  // ── Callbacks for column actions ───────────────────────────────
  const onDelete = useCallback((user: ClerkUserInfo) => {
    setDeleteTarget(user);
  }, []);

  const onImpersonate = useCallback(
    async (user: ClerkUserInfo) => {
      await startImpersonation(user.id);
      router.push("/dashboard");
      router.refresh();
    },
    [router]
  );

  const onToggleStatus = useCallback(
    async (user: ClerkUserInfo) => {
      if (user.status === "active") {
        // Show confirmation for suspend
        setSuspendTarget(user);
      } else {
        // Reactivate directly (no confirmation needed)
        const result = await setUserStatus(user.id, "active");
        if (result.success) {
          toast.success(`${user.name} reactivated`);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }
    },
    [router]
  );

  // ── Confirm suspend ────────────────────────────────────────────
  async function handleConfirmSuspend() {
    if (!suspendTarget) return;
    setActionLoading(true);
    const result = await setUserStatus(suspendTarget.id, "suspended");
    setActionLoading(false);
    if (result.success) {
      toast.success(`${suspendTarget.name} suspended`);
      setSuspendTarget(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  // ── Confirm delete ─────────────────────────────────────────────
  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    const result = await deleteUser(deleteTarget.id);
    setActionLoading(false);
    if (result.success) {
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  // ── Table state ────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    { id: "status", value: "active" },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });

  // ── Columns (memoized) ────────────────────────────────────────
  const columns = useMemo(
    () =>
      getUserColumns({
        currentClerkUserId,
        isAdmin,
        allTags,
        onDelete,
        onImpersonate,
        onToggleStatus,
      }),
    [currentClerkUserId, isAdmin, allTags, onDelete, onImpersonate, onToggleStatus]
  );

  // ── Table instance ─────────────────────────────────────────────
  const table = useReactTable({
    data: filteredByTags,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const q = filterValue.toLowerCase();
      const user = row.original;
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
      );
    },
  });

  // ── Helpers for filter toolbar ─────────────────────────────────
  const roleFilter =
    (columnFilters.find((f) => f.id === "role")?.value as string) ?? "all";
  const stripeFilter =
    (columnFilters.find((f) => f.id === "isStripeCustomer")?.value as string) ??
    "all";
  const statusFilter =
    (columnFilters.find((f) => f.id === "status")?.value as string) ?? "all";

  const hasActiveFilters =
    globalFilter !== "" ||
    roleFilter !== "all" ||
    selectedTags.length > 0 ||
    stripeFilter !== "all" ||
    statusFilter !== "active"; // "active" is the default, so only show clear when changed

  function clearAllFilters() {
    setGlobalFilter("");
    setColumnFilters([{ id: "status", value: "active" }]);
    setSelectedTags([]);
  }

  // Pagination info
  const totalRows = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <>
      {/* ── Filter Toolbar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="pl-9"
          />
        </div>

        {/* Role filter */}
        <Select
          value={roleFilter}
          onValueChange={(value) => {
            table.getColumn("role")?.setFilterValue(value);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="team_member">Team Member</SelectItem>
            <SelectItem value="client">Client</SelectItem>
          </SelectContent>
        </Select>

        {/* Tags popover */}
        {allTags.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Tags
                {selectedTags.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 px-1.5 text-xs"
                  >
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1">
                {allTags.map((tag) => (
                  <label
                    key={tag}
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() => {
                        toggleTag(tag);
                        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                      }}
                    />
                    {tag}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Stripe filter */}
        <Select
          value={stripeFilter}
          onValueChange={(value) => {
            table.getColumn("isStripeCustomer")?.setFilterValue(value);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Stripe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stripe</SelectItem>
            <SelectItem value="yes">Stripe Customer</SelectItem>
            <SelectItem value="no">Non-Stripe</SelectItem>
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            table.getColumn("status")?.setFilterValue(value);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
        >
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear all */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-muted-foreground"
            onClick={clearAllFilters}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* ── Data Table ──────────────────────────────────────────── */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground py-8"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {from}&ndash;{to} of {totalRows} users
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={(value) =>
              setPagination({ pageIndex: 0, pageSize: Number(value) })
            }
          >
            <SelectTrigger className="w-[80px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Suspend Confirmation Dialog ─────────────────────────── */}
      <AlertDialog
        open={!!suspendTarget}
        onOpenChange={(open) => {
          if (!open) setSuspendTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Suspend &quot;{suspendTarget?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will block the user from signing in. You can reactivate them
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSuspend}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Confirmation Dialog ──────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{deleteTarget?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account and remove all their
              portal client links. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
