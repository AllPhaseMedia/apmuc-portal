"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { SERVICE_TYPE_LABELS } from "@/lib/constants";
import {
  Search,
  ArrowUpDown,
  Check,
  Minus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type ClientRow = {
  id: string;
  name: string;
  isActive: boolean;
  websiteUrl: string | null;
  stripeCustomerId: string | null;
  umamiSiteId: string | null;
  uptimeKumaMonitorId: string | null;
  services: { id: string; type: string }[];
  _count: { contacts: number };
};

type Props = {
  clients: ClientRow[];
  isAdmin?: boolean;
};

function SortableHeader({
  column,
  children,
}: {
  column: { toggleSorting: (desc?: boolean) => void };
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting()}
    >
      {children}
      <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
    </Button>
  );
}

export function ClientsTable({ clients, isAdmin = false }: Props) {
  // ── Table state ────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });

  // ── Column definitions ─────────────────────────────────────────
  const columns = useMemo<ColumnDef<ClientRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <SortableHeader column={column}>Name</SortableHeader>
        ),
        cell: ({ row }) => (
          <Link
            href={`/admin/clients/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "services",
        header: "Services",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.services.map((s) => (
              <Badge key={s.id} variant="secondary" className="text-xs">
                {SERVICE_TYPE_LABELS[s.type] ?? s.type}
              </Badge>
            ))}
          </div>
        ),
        enableSorting: false,
      },
      {
        id: "analytics",
        accessorFn: (row) => !!row.umamiSiteId,
        header: ({ column }) => (
          <SortableHeader column={column}>Analytics</SortableHeader>
        ),
        cell: ({ row }) =>
          row.original.umamiSiteId ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Minus className="h-4 w-4 text-muted-foreground" />
          ),
      },
      {
        id: "uptime",
        accessorFn: (row) => !!row.uptimeKumaMonitorId,
        header: ({ column }) => (
          <SortableHeader column={column}>Uptime</SortableHeader>
        ),
        cell: ({ row }) =>
          row.original.uptimeKumaMonitorId ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Minus className="h-4 w-4 text-muted-foreground" />
          ),
      },
      {
        id: "billing",
        accessorFn: (row) => !!row.stripeCustomerId,
        header: ({ column }) => (
          <SortableHeader column={column}>Billing</SortableHeader>
        ),
        cell: ({ row }) =>
          row.original.stripeCustomerId ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Minus className="h-4 w-4 text-muted-foreground" />
          ),
      },
      {
        id: "users",
        accessorFn: (row) => row._count.contacts,
        header: ({ column }) => (
          <SortableHeader column={column}>Users</SortableHeader>
        ),
        cell: ({ row }) => {
          const count = row.original._count.contacts;
          return count > 0 ? (
            <span className="font-medium">{count}</span>
          ) : (
            <Minus className="h-4 w-4 text-muted-foreground" />
          );
        },
      },
      {
        accessorKey: "isActive",
        header: ({ column }) => (
          <SortableHeader column={column}>Status</SortableHeader>
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "default" : "outline"}>
            {row.original.isActive ? "Active" : "Archived"}
          </Badge>
        ),
      },
    ],
    []
  );

  // ── Table instance ─────────────────────────────────────────────
  const table = useReactTable({
    data: clients,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination,
      columnVisibility: {
        billing: isAdmin,
      },
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const q = filterValue.toLowerCase();
      return row.original.name.toLowerCase().includes(q);
    },
  });

  // ── Pagination info ────────────────────────────────────────────
  const totalRows = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <>
      {/* ── Search ──────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={globalFilter}
          onChange={(e) => {
            setGlobalFilter(e.target.value);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
          className="pl-9"
        />
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
                  colSpan={table.getVisibleLeafColumns().length}
                  className="text-center text-muted-foreground py-8"
                >
                  No clients found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={!row.original.isActive ? "opacity-50" : ""}
                >
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
          Showing {from}&ndash;{to} of {totalRows} clients
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
    </>
  );
}
