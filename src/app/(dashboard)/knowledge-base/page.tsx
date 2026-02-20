import { requireAuth } from "@/lib/auth";
import { getPublishedCategories } from "@/actions/knowledge-base";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchBar } from "@/components/kb/search-bar";
import { BookOpen, FolderOpen } from "lucide-react";
import Link from "next/link";

export default async function KnowledgeBasePage() {
  await requireAuth();
  const result = await getPublishedCategories();

  if (!result.success) {
    return <p className="text-destructive">{result.error}</p>;
  }

  const categories = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Find answers to common questions and learn how to get the most out of
          your services.
        </p>
      </div>

      <div className="max-w-md">
        <SearchBar />
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No articles published yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/knowledge-base/${cat.slug}`}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{cat.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {cat.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {cat.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {cat._count.articles} article
                    {cat._count.articles !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
