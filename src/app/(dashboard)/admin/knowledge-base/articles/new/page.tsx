import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/actions/admin/kb";
import { ArticleForm } from "@/components/admin/article-form";

export default async function NewArticlePage() {
  await requireAdmin();
  const result = await getCategories();

  if (!result.success) {
    return <p className="text-destructive">{result.error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Article</h1>
        <p className="text-muted-foreground">
          Create a new knowledge base article.
        </p>
      </div>
      <ArticleForm categories={result.data} />
    </div>
  );
}
