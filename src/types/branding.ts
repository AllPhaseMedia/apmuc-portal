export type BrandingSettings = {
  name: string;
  fullName: string;
  tagline: string;
  description: string;
  url: string;
  companyName: string;
  companyLocation: string;
  logoLight: string; // base64 data URL
  logoDark: string; // base64 data URL
  colorPrimary: string; // OKLCh string e.g. "oklch(0.705 0.213 47.604)"
  colorSidebar: string; // OKLCh string
};

export type HeroCta = {
  label: string;
  href: string;
};

export type HomepageHero = {
  title: string;
  description: string;
  primaryCta: HeroCta;
  secondaryCta: HeroCta;
  backgroundImage?: string; // base64 data URL
  textColor?: string; // hex color
};

export type FeatureBlock = {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name
  cta: HeroCta;
  order: number;
};

export type HeaderLink = {
  id: string;
  label: string;
  href: string;
  order: number;
};

export type FooterLink = {
  id: string;
  label: string;
  href: string;
  order: number;
};

export type HomepageData = {
  branding: BrandingSettings;
  hero: HomepageHero;
  blocks: FeatureBlock[];
  contentAbove: string;
  contentBelow: string;
  footerContent: string;
  footerLinks: FooterLink[];
  headerLinks: HeaderLink[];
};

export type ClientNavLink = {
  id: string;
  label: string;
  href: string;
  openInNewTab: boolean;
  order: number;
};
