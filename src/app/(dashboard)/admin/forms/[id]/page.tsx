import { requireAdmin } from "@/lib/auth";
import { getForm } from "@/actions/admin/forms";
import { FormBuilder } from "@/components/admin/form-builder";
import { notFound } from "next/navigation";

interface EditFormPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFormPage({ params }: EditFormPageProps) {
  await requireAdmin();
  const { id } = await params;
  const result = await getForm(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Form</h1>
        <p className="text-muted-foreground">Modify your form fields and settings</p>
      </div>
      <FormBuilder form={result.data} />
    </div>
  );
}
