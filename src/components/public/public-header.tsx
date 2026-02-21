"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BrandingSettings } from "@/types/branding";

type Props = {
  branding: BrandingSettings;
};

export function PublicHeader({ branding }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const logoSrc = branding.logoLight;

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
          <Button variant="ghost" asChild>
            <Link href="/forms/support-request">Submit a Request</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
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
            <Button variant="ghost" className="justify-start" asChild>
              <Link href="/forms/support-request" onClick={() => setMenuOpen(false)}>
                Submit a Request
              </Link>
            </Button>
            <Button className="justify-start" asChild>
              <Link href="/sign-in" onClick={() => setMenuOpen(false)}>
                Sign In
              </Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
