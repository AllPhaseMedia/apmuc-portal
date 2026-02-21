import { requireAdmin } from "@/lib/auth";
import { FormBuilder } from "@/components/admin/form-builder";

export default async function NewFormPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Form</h1>
        <p className="text-muted-foreground">Design a new form with the drag-and-drop builder</p>
      </div>
      <FormBuilder />
    </div>
  );
}
