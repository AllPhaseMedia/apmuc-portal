import Link from "next/link";
import type { BrandingSettings, FooterLink } from "@/types/branding";

type Props = {
  branding: BrandingSettings;
  content: string;
  links: FooterLink[];
};

export function PublicFooter({ branding, content, links }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {content && (
          <div
            className="prose prose-sm prose-neutral dark:prose-invert max-w-none mb-6"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}

        {links.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-4">
            {links.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          &copy; {year} {branding.companyName}
          {branding.companyLocation ? ` — ${branding.companyLocation}` : ""}
        </p>
      </div>
    </footer>
  );
}
