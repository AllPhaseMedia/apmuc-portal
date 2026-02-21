import { requireAdmin } from "@/lib/auth";
import { getRecommendedServices } from "@/actions/admin/services";
import { getForms } from "@/actions/admin/forms";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { ServiceDialog } from "@/components/admin/service-dialog";

export default async function AdminServicesPage() {
  await requireAdmin();
  const [result, formsResult] = await Promise.all([
    getRecommendedServices(),
    getForms(),
  ]);

  if (!result.success) {
    return <p className="text-destructive">{result.error}</p>;
  }

  const services = result.data;
  const forms = formsResult.success
    ? formsResult.data.filter((f) => f.isActive)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Recommended Services
          </h1>
          <p className="text-muted-foreground">
            Services shown to clients as upsell opportunities.
          </p>
        </div>
        <ServiceDialog forms={forms}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        </ServiceDialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>CTA</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  No recommended services yet.
                </TableCell>
              </TableRow>
            ) : (
              services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {SERVICE_TYPE_LABELS[service.type] ?? service.type}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {service.ctaLabel || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={service.isActive ? "default" : "outline"}>
                      {service.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ServiceDialog service={service} forms={forms}>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </ServiceDialog>
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
