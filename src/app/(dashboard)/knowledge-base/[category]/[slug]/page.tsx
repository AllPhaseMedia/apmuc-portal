import { requireAuth, getAuthUser } from "@/lib/auth";
import { getPublishedArticle } from "@/actions/knowledge-base";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ArticleContent } from "@/components/kb/article-content";
import { FeedbackWidget } from "@/components/kb/feedback-widget";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ category: string; slug: string }>;
};

export default async function ArticlePage({ params }: Props) {
  const user = await requireAuth();
  const { category, slug } = await params;
  const result = await getPublishedArticle(slug);

  if (!result.success) {
    notFound();
  }

  const article = result.data;

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
            <BreadcrumbLink href={`/knowledge-base/${category}`}>
              {article.category.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{article.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{article.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last updated {format(new Date(article.updatedAt), "MMMM d, yyyy")}
          </p>
        </div>
        {user.isAdmin && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/knowledge-base/articles/${article.id}`}>
              <Pencil className="mr-2 h-3 w-3" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="py-6">
          <ArticleContent content={article.content} />
        </CardContent>
      </Card>

      <Separator />

      <FeedbackWidget
        articleId={article.id}
        helpfulCount={article.helpfulCount}
        notHelpfulCount={article.notHelpfulCount}
      />
    </div>
  );
}
