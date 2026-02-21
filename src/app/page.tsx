import { getHomepageData } from "@/lib/branding";
import { PublicHeader } from "@/components/public/public-header";
import { HeroSection } from "@/components/public/hero-section";
import { FeatureGrid } from "@/components/public/feature-grid";
import { RichContentSection } from "@/components/public/rich-content-section";
import { PublicFooter } from "@/components/public/public-footer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getHomepageData();

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader branding={data.branding} />
      <main className="flex-1">
        <HeroSection hero={data.hero} />
        <RichContentSection html={data.contentAbove} />
        <FeatureGrid blocks={data.blocks} />
        <RichContentSection html={data.contentBelow} />
      </main>
      <PublicFooter
        branding={data.branding}
        content={data.footerContent}
        links={data.footerLinks}
      />
    </div>
  );
}
