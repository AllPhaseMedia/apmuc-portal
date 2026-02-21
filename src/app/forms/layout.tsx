import { getHomepageData } from "@/lib/branding";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";

export default async function FormsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getHomepageData();

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <PublicHeader branding={data.branding} headerLinks={data.headerLinks} />
      <main className="flex flex-1 flex-col">{children}</main>
      <PublicFooter
        branding={data.branding}
        content={data.footerContent}
        links={data.footerLinks}
      />
    </div>
  );
}
