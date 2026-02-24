import { requireStaff } from "@/lib/auth";
import { getClients } from "@/actions/admin/clients";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClientsTable } from "@/components/admin/clients-table";
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
    <div className="space-y-4">
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

      <ClientsTable clients={clients} />
    </div>
  );
}
