import { requireStaff } from "@/lib/auth";
import { getForms } from "@/actions/admin/forms";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Inbox, Globe, Lock } from "lucide-react";
import { DeleteFormButton } from "@/components/admin/delete-form-button";

export default async function AdminFormsPage() {
  await requireStaff();
  const result = await getForms();

  if (!result.success) {
    return <p className="text-destructive">Error: {result.error}</p>;
  }

  const forms = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Forms</h1>
          <p className="text-muted-foreground">Create and manage dynamic forms</p>
        </div>
        <Button asChild>
          <Link href="/admin/forms/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Create Form
          </Link>
        </Button>
      </div>

      {forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No forms yet</h3>
          <p className="text-muted-foreground mb-4">Create your first form to get started</p>
          <Button asChild>
            <Link href="/admin/forms/new">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Form
            </Link>
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Submissions</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.map((form) => (
              <TableRow key={form.id}>
                <TableCell className="font-medium">{form.name}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">
                  /{form.slug}
                </TableCell>
                <TableCell>
                  {form.isPublic ? (
                    <Badge variant="outline" className="gap-1">
                      <Globe className="h-3 w-3" />
                      Public
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="h-3 w-3" />
                      Private
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={form.isActive ? "default" : "secondary"}>
                    {form.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{form._count.submissions}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href={`/admin/forms/${form.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <DeleteFormButton formId={form.id} formName={form.name} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
