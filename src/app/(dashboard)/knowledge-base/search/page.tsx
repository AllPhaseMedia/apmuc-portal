import { requireAuth } from "@/lib/auth";
import { searchArticles } from "@/actions/knowledge-base";
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
import { FileText, SearchX } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  await requireAuth();
  const { q } = await searchParams;
  const query = q ?? "";
  const result = await searchArticles(query);

  const articles = result.success ? result.data : [];

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
            <BreadcrumbPage>Search</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search Results</h1>
        {query && (
          <p className="text-muted-foreground">
            {articles.length} result{articles.length !== 1 ? "s" : ""} for
            &quot;{query}&quot;
          </p>
        )}
      </div>

      <div className="max-w-md">
        <SearchBar defaultValue={query} />
      </div>

      {articles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <SearchX className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {query
                ? "No articles found. Try a different search term."
                : "Enter a search term to find articles."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/knowledge-base/${article.category.slug}/${article.slug}`}
            >
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-start gap-3 py-4">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <h3 className="font-medium">{article.title}</h3>
                    <p className="text-xs text-primary/70 mt-0.5">
                      {article.category.name}
                    </p>
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
