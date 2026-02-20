import { requireAdmin } from "@/lib/auth";
import { getArticle, getCategories } from "@/actions/admin/kb";
import { ArticleForm } from "@/components/admin/article-form";
import { DeleteArticleButton } from "@/components/admin/delete-article-button";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditArticlePage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const [articleResult, catResult] = await Promise.all([
    getArticle(id),
    getCategories(),
  ]);

  if (!articleResult.success) {
    notFound();
  }
  if (!catResult.success) {
    return <p className="text-destructive">{catResult.error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Article</h1>
          <p className="text-muted-foreground">{articleResult.data.title}</p>
        </div>
        <DeleteArticleButton
          articleId={id}
          articleTitle={articleResult.data.title}
        />
      </div>
      <ArticleForm article={articleResult.data} categories={catResult.data} />
    </div>
  );
}
