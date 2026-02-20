import { requireAuth } from "@/lib/auth";
import { getPublishedArticle } from "@/actions/knowledge-base";
import { Card, CardContent } from "@/components/ui/card";
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
  await requireAuth();
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

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{article.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Last updated {format(new Date(article.updatedAt), "MMMM d, yyyy")}
        </p>
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
