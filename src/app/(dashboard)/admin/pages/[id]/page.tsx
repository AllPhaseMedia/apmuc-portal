import { requireStaff } from "@/lib/auth";
import { getPage } from "@/actions/admin/pages";
import { PageForm } from "@/components/admin/page-form";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditPageRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const page = await getPage(id);

  if (!page) return notFound();

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
        <h1 className="text-2xl font-bold tracking-tight">Edit Page</h1>
      </div>
      <PageForm page={page} />
    </div>
  );
}
