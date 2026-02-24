import { requireStaff } from "@/lib/auth";
import { getClients } from "@/actions/admin/clients";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Archive } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ archived?: string }>;
}

export default async function AdminClientsPage({ searchParams }: PageProps) {
  await requireStaff();
  const params = await searchParams;
  const showArchived = params.archived === "true";
  const result = await getClients(showArchived);

  if (!result.success) {
    return <p className="text-destructive">{result.error}</p>;
  }

  const clients = result.data;
  const activeCount = showArchived ? clients.filter((c) => c.isActive).length : clients.length;
  const archivedCount = showArchived ? clients.filter((c) => !c.isActive).length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            {activeCount} active{showArchived && archivedCount > 0 ? `, ${archivedCount} archived` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={showArchived ? "/admin/clients" : "/admin/clients?archived=true"}>
              <Archive className="mr-2 h-4 w-4" />
              {showArchived ? "Hide archived" : "Show archived"}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/clients/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No clients yet.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id} className={!client.isActive ? "opacity-50" : ""}>
                  <TableCell>
                    <Link
                      href={`/admin/clients/${client.id}`}
                      className="font-medium hover:underline"
                    >
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {client.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {client.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {client.services.map((s) => (
                        <Badge key={s.id} variant="secondary" className="text-xs">
                          {SERVICE_TYPE_LABELS[s.type] ?? s.type}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.isActive ? "default" : "outline"}>
                      {client.isActive ? "Active" : "Archived"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
