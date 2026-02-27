import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/constants";
import type {
  BrandingSettings,
  HomepageData,
  HomepageHero,
  FeatureBlock,
  FooterLink,
  HeaderLink,
} from "@/types/branding";

const BRANDING_KEYS = [
  "brandName",
  "brandFullName",
  "brandTagline",
  "brandDescription",
  "brandUrl",
  "brandCompanyName",
  "brandCompanyLocation",
  "brandLogoLight",
  "brandLogoDark",
  "brandColorPrimary",
  "brandColorSidebar",
] as const;

const DEFAULT_BRANDING: BrandingSettings = {
  name: BRAND.name,
  fullName: BRAND.fullName,
  tagline: BRAND.tagline,
  description: BRAND.description,
  url: BRAND.url,
  companyName: BRAND.company.name,
  companyLocation: BRAND.company.location,
  logoLight: "",
  logoDark: "",
  colorPrimary: "",
  colorSidebar: "",
};

const DEFAULT_HEADER_LINKS: HeaderLink[] = [
  {
    id: "default-submit",
    label: "Submit a Request",
    href: "/forms/support-request",
    order: 0,
  },
  {
    id: "default-signin",
    label: "Sign In",
    href: "/sign-in",
    order: 1,
  },
];

const DEFAULT_HERO: HomepageHero = {
  title: "How can we help you?",
  description:
    "Submit a support request, manage your billing, or browse our knowledge base.",
  primaryCta: { label: "Submit a Request", href: "/forms/support-request" },
  secondaryCta: { label: "Sign In", href: "/sign-in" },
};

const DEFAULT_BLOCKS: FeatureBlock[] = [
  {
    id: "default-support",
    title: "Support",
    description:
      "Submit a request and our team will get back to you as soon as possible.",
    icon: "MessageSquare",
    cta: { label: "Get Support", href: "/forms/support-request" },
    order: 0,
  },
  {
    id: "default-billing",
    title: "Billing",
    description:
      "View invoices, manage payment methods, and review your subscription.",
    icon: "CreditCard",
    cta: { label: "View Billing", href: "/billing" },
    order: 1,
  },
  {
    id: "default-kb",
    title: "Knowledge Base",
    description:
      "Browse articles, guides, and FAQs to find answers on your own.",
    icon: "BookOpen",
    cta: { label: "Browse Articles", href: "/knowledge-base" },
    order: 2,
  },
];

export const getBranding = cache(async (): Promise<BrandingSettings> => {
  try {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: [...BRANDING_KEYS] } },
    });

    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    return {
      name: map.brandName || DEFAULT_BRANDING.name,
      fullName: map.brandFullName || DEFAULT_BRANDING.fullName,
      tagline: map.brandTagline || DEFAULT_BRANDING.tagline,
      description: map.brandDescription || DEFAULT_BRANDING.description,
      url: map.brandUrl || DEFAULT_BRANDING.url,
      companyName: map.brandCompanyName || DEFAULT_BRANDING.companyName,
      companyLocation:
        map.brandCompanyLocation || DEFAULT_BRANDING.companyLocation,
      logoLight: map.brandLogoLight || "",
      logoDark: map.brandLogoDark || "",
      colorPrimary: map.brandColorPrimary || "",
      colorSidebar: map.brandColorSidebar || "",
    };
  } catch {
    // Fallback to defaults when DB is unavailable (e.g. build time)
    return { ...DEFAULT_BRANDING };
  }
});

export const getDashboardAnnouncement = cache(async () => {
  try {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: ["dashboardMessage", "dashboardMessageId"] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      message: map.dashboardMessage || "",
      messageId: map.dashboardMessageId || "",
    };
  } catch {
    return { message: "", messageId: "" };
  }
});

export const getHomepageData = cache(async (): Promise<HomepageData> => {
  try {
    const allKeys = [
      ...BRANDING_KEYS,
      "homepageHero",
      "homepageBlocks",
      "homepageContentAbove",
      "homepageContentBelow",
      "footerContent",
      "footerLinks",
      "headerLinks",
    ];

    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: allKeys } },
    });

    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    // Build branding from map
    const branding: BrandingSettings = {
      name: map.brandName || DEFAULT_BRANDING.name,
      fullName: map.brandFullName || DEFAULT_BRANDING.fullName,
      tagline: map.brandTagline || DEFAULT_BRANDING.tagline,
      description: map.brandDescription || DEFAULT_BRANDING.description,
      url: map.brandUrl || DEFAULT_BRANDING.url,
      companyName: map.brandCompanyName || DEFAULT_BRANDING.companyName,
      companyLocation:
        map.brandCompanyLocation || DEFAULT_BRANDING.companyLocation,
      logoLight: map.brandLogoLight || "",
      logoDark: map.brandLogoDark || "",
      colorPrimary: map.brandColorPrimary || "",
      colorSidebar: map.brandColorSidebar || "",
    };

    let hero = DEFAULT_HERO;
    if (map.homepageHero) {
      try {
        hero = JSON.parse(map.homepageHero);
      } catch {
        // use default
      }
    }

    let blocks = DEFAULT_BLOCKS;
    if (map.homepageBlocks) {
      try {
        blocks = JSON.parse(map.homepageBlocks);
      } catch {
        // use default
      }
    }

    let footerLinks: FooterLink[] = [];
    if (map.footerLinks) {
      try {
        footerLinks = JSON.parse(map.footerLinks);
      } catch {
        // use default
      }
    }

    let headerLinks: HeaderLink[] = DEFAULT_HEADER_LINKS;
    if (map.headerLinks) {
      try {
        headerLinks = JSON.parse(map.headerLinks);
      } catch {
        // use default
      }
    }

    return {
      branding,
      hero,
      blocks: blocks.sort((a, b) => a.order - b.order),
      contentAbove: map.homepageContentAbove || "",
      contentBelow: map.homepageContentBelow || "",
      footerContent: map.footerContent || "",
      footerLinks: footerLinks.sort((a, b) => a.order - b.order),
      headerLinks: headerLinks.sort((a, b) => a.order - b.order),
    };
  } catch {
    // Fallback to defaults when DB is unavailable (e.g. build time)
    return {
      branding: { ...DEFAULT_BRANDING },
      hero: DEFAULT_HERO,
      blocks: DEFAULT_BLOCKS,
      contentAbove: "",
      contentBelow: "",
      footerContent: "",
      footerLinks: [],
      headerLinks: DEFAULT_HEADER_LINKS,
    };
  }
});
