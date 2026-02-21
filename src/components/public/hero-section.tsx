import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { HomepageHero } from "@/types/branding";

type Props = {
  hero: HomepageHero;
};

export function HeroSection({ hero }: Props) {
  return (
    <section className="relative overflow-hidden bg-primary/5 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {hero.title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          {hero.description}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {hero.primaryCta.label && (
            <Button size="lg" asChild>
              <Link href={hero.primaryCta.href}>{hero.primaryCta.label}</Link>
            </Button>
          )}
          {hero.secondaryCta.label && (
            <Button variant="outline" size="lg" asChild>
              <Link href={hero.secondaryCta.href}>
                {hero.secondaryCta.label}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
