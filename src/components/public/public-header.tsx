"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BrandingSettings, HeaderLink } from "@/types/branding";

type Props = {
  branding: BrandingSettings;
  headerLinks?: HeaderLink[];
};

const DEFAULT_LINKS: HeaderLink[] = [
  { id: "default-submit", label: "Submit a Request", href: "/forms/support-request", order: 0 },
  { id: "default-signin", label: "Sign In", href: "/sign-in", order: 1 },
];

export function PublicHeader({ branding, headerLinks }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const logoSrc = branding.logoLight;
  const links = headerLinks && headerLinks.length > 0 ? headerLinks : DEFAULT_LINKS;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo + name */}
        <Link href="/" className="flex items-center gap-2">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={branding.name}
              className="h-8 w-8 rounded-md object-contain"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
              {branding.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-lg font-semibold">{branding.name}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 sm:flex">
          {links.map((link, i) =>
            i === links.length - 1 ? (
              <Button key={link.id} asChild>
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ) : (
              <Button key={link.id} variant="ghost" asChild>
                <Link href={link.href}>{link.label}</Link>
              </Button>
            )
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="sm:hidden p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t bg-background px-4 py-4 sm:hidden">
          <nav className="flex flex-col gap-2">
            {links.map((link, i) =>
              i === links.length - 1 ? (
                <Button key={link.id} className="justify-start" asChild>
                  <Link href={link.href} onClick={() => setMenuOpen(false)}>
                    {link.label}
                  </Link>
                </Button>
              ) : (
                <Button key={link.id} variant="ghost" className="justify-start" asChild>
                  <Link href={link.href} onClick={() => setMenuOpen(false)}>
                    {link.label}
                  </Link>
                </Button>
              )
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
