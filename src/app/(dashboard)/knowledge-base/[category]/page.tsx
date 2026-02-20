import { requireAuth } from "@/lib/auth";
import { getArticlesByCategory } from "@/actions/knowledge-base";
import { Card, CardContent } from "@/components/ui/card";
import { SearchBar } from "@/components/kb/search-bar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { FileText } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ category: string }>;
};

export default async function CategoryPage({ params }: Props) {
  await requireAuth();
  const { category } = await params;
  const result = await getArticlesByCategory(category);

  if (!result.success) {
    notFound();
  }

  const { name, articles } = result.data;

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/knowledge-base">
              Knowledge Base
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
        <p className="text-muted-foreground">
          {articles.length} article{articles.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="max-w-md">
        <SearchBar />
      </div>

      {articles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No articles in this category yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/knowledge-base/${category}/${article.slug}`}
            >
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-start gap-3 py-4">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <h3 className="font-medium">{article.title}</h3>
                    {article.excerpt && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated{" "}
                      {format(new Date(article.updatedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
