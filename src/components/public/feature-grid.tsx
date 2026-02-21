import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "./lucide-icon";
import type { FeatureBlock } from "@/types/branding";

type Props = {
  blocks: FeatureBlock[];
};

export function FeatureGrid({ blocks }: Props) {
  if (blocks.length === 0) return null;

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((block) => (
            <Card key={block.id} className="flex flex-col">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <LucideIcon name={block.icon} />
                </div>
                <CardTitle className="text-lg">{block.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="flex-1 text-sm text-muted-foreground">
                  {block.description}
                </p>
                {block.cta.label && (
                  <div className="mt-4">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={block.cta.href}>{block.cta.label}</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
