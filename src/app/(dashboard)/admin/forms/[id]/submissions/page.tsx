import { requireAdmin } from "@/lib/auth";
import { getForm } from "@/actions/admin/forms";
import { getSubmissions } from "@/actions/admin/submissions";
import { SubmissionsTable } from "@/components/admin/submissions-table";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { FormField } from "@/types/forms";

interface SubmissionsPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubmissionsPage({ params }: SubmissionsPageProps) {
  await requireAdmin();
  const { id } = await params;

  const [formResult, subsResult] = await Promise.all([
    getForm(id),
    getSubmissions(id),
  ]);

  if (!formResult.success || !formResult.data) notFound();
  if (!subsResult.success) {
    return <p className="text-destructive">Error: {subsResult.error}</p>;
  }

  const form = formResult.data;
  const fields = form.fields as unknown as FormField[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/forms/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{form.name} — Submissions</h1>
          <p className="text-muted-foreground">View and manage form responses</p>
        </div>
      </div>

      <SubmissionsTable
        submissions={subsResult.data.submissions}
        fields={fields}
        formId={id}
        total={subsResult.data.total}
      />
    </div>
  );
}
