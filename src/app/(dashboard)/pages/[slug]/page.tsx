import { requireAuth } from "@/lib/auth";
import { getPublishedPage } from "@/actions/admin/pages";
import { notFound } from "next/navigation";

export default async function CustomPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAuth();
  const { slug } = await params;
  const page = await getPublishedPage(slug);

  if (!page) return notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{page.title}</h1>
      {page.content && (
        <div
          className="prose prose-neutral dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      )}
    </div>
  );
}
