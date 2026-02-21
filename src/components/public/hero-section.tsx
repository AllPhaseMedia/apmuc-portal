import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { HomepageHero } from "@/types/branding";

type Props = {
  hero: HomepageHero;
};

export function HeroSection({ hero }: Props) {
  const hasBackground = !!hero.backgroundImage;

  return (
    <section
      className="relative overflow-hidden py-20 sm:py-28"
      style={
        hasBackground
          ? {
              backgroundImage: `url(${hero.backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {/* Default bg when no image */}
      {!hasBackground && (
        <div className="absolute inset-0 bg-primary/5" />
      )}

      {/* Dark overlay when background image is set */}
      {hasBackground && (
        <div className="absolute inset-0 bg-black/50" />
      )}

      <div
        className="relative mx-auto max-w-4xl px-4 text-center sm:px-6"
        style={hero.textColor ? { color: hero.textColor } : undefined}
      >
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {hero.title}
        </h1>
        <p
          className={`mx-auto mt-6 max-w-2xl text-lg sm:text-xl ${
            hero.textColor ? "opacity-80" : "text-muted-foreground"
          }`}
        >
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
