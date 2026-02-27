import { requireStaff } from "@/lib/auth";
import { PageForm } from "@/components/admin/page-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewPageRoute() {
  await requireStaff();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href="/admin/pages"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pages
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Create Page</h1>
      </div>
      <PageForm />
    </div>
  );
}
