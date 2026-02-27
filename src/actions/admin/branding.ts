"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import type { ActionResult } from "@/types";
import type {
  BrandingSettings,
  HomepageHero,
  FeatureBlock,
  FooterLink,
  HeaderLink,
  ClientNavLink,
} from "@/types/branding";

async function upsertSetting(key: string, value: string) {
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

async function getSettingMap(keys: string[]): Promise<Record<string, string>> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: keys } },
  });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// ─── Branding ────────────────────────────────────────────────

export async function getBrandingSettings(): Promise<
  ActionResult<Partial<BrandingSettings>>
> {
  try {
    await requireStaff();
    const keys = [
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
    ];
    const map = await getSettingMap(keys);
    return {
      success: true,
      data: {
        name: map.brandName ?? "",
        fullName: map.brandFullName ?? "",
        tagline: map.brandTagline ?? "",
        description: map.brandDescription ?? "",
        url: map.brandUrl ?? "",
        companyName: map.brandCompanyName ?? "",
        companyLocation: map.brandCompanyLocation ?? "",
        logoLight: map.brandLogoLight ?? "",
        logoDark: map.brandLogoDark ?? "",
        colorPrimary: map.brandColorPrimary ?? "",
        colorSidebar: map.brandColorSidebar ?? "",
      },
    };
  } catch (error) {
    console.error("[branding] getBrandingSettings error:", error);
    return { success: false, error: "Failed to load branding settings" };
  }
}

export async function saveBrandingSettings(
  settings: Partial<BrandingSettings>
): Promise<ActionResult<{ message: string }>> {
  try {
    await requireStaff();

    const keyMap: Record<string, keyof BrandingSettings> = {
      brandName: "name",
      brandFullName: "fullName",
      brandTagline: "tagline",
      brandDescription: "description",
      brandUrl: "url",
      brandCompanyName: "companyName",
      brandCompanyLocation: "companyLocation",
      brandLogoLight: "logoLight",
      brandLogoDark: "logoDark",
      brandColorPrimary: "colorPrimary",
      brandColorSidebar: "colorSidebar",
    };

    for (const [dbKey, settingKey] of Object.entries(keyMap)) {
      const value = settings[settingKey];
      if (value !== undefined) {
        await upsertSetting(dbKey, value);
      }
    }

    return { success: true, data: { message: "Branding settings saved" } };
  } catch (error) {
    console.error("[branding] saveBrandingSettings error:", error);
    return { success: false, error: "Failed to save branding settings" };
  }
}

// ─── Homepage ────────────────────────────────────────────────

export async function getHomepageSettings(): Promise<
  ActionResult<{
    hero: HomepageHero | null;
    blocks: FeatureBlock[] | null;
    contentAbove: string;
    contentBelow: string;
  }>
> {
  try {
    await requireStaff();
    const keys = [
      "homepageHero",
      "homepageBlocks",
      "homepageContentAbove",
      "homepageContentBelow",
    ];
    const map = await getSettingMap(keys);

    let hero: HomepageHero | null = null;
    if (map.homepageHero) {
      try {
        hero = JSON.parse(map.homepageHero);
      } catch {
        /* ignore */
      }
    }

    let blocks: FeatureBlock[] | null = null;
    if (map.homepageBlocks) {
      try {
        blocks = JSON.parse(map.homepageBlocks);
      } catch {
        /* ignore */
      }
    }

    return {
      success: true,
      data: {
        hero,
        blocks,
        contentAbove: map.homepageContentAbove ?? "",
        contentBelow: map.homepageContentBelow ?? "",
      },
    };
  } catch (error) {
    console.error("[branding] getHomepageSettings error:", error);
    return { success: false, error: "Failed to load homepage settings" };
  }
}

export async function saveHomepageHero(
  hero: HomepageHero
): Promise<ActionResult<{ message: string }>> {
  try {
    await requireStaff();
    await upsertSetting("homepageHero", JSON.stringify(hero));
    return { success: true, data: { message: "Hero section saved" } };
  } catch (error) {
    console.error("[branding] saveHomepageHero error:", error);
    return { success: false, error: "Failed to save hero section" };
  }
}

export async function saveHomepageBlocks(
  blocks: FeatureBlock[]
): Promise<ActionResult<{ message: string }>> {
  try {
    await requireStaff();
    await upsertSetting("homepageBlocks", JSON.stringify(blocks));
    return { success: true, data: { message: "Feature blocks saved" } };
  } catch (error) {
    console.error("[branding] saveHomepageBlocks error:", error);
    return { success: false, error: "Failed to save feature blocks" };
  }
}

const HOMEPAGE_CONTENT_KEYS = ["homepageContentAbove", "homepageContentBelow"] as const;

export async function saveHomepageContent(
  key: "homepageContentAbove" | "homepageContentBelow",
  html: string
): Promise<ActionResult<{ message: string }>> {
  try {
    await requireStaff();
    if (!HOMEPAGE_CONTENT_KEYS.includes(key as typeof HOMEPAGE_CONTENT_KEYS[number])) {
      return { success: false, error: "Invalid content key" };
    }
    await upsertSetting(key, html);
    return { success: true, data: { message: "Content saved" } };
  } catch (error) {
    console.error("[branding] saveHomepageContent error:", error);
    return { success: false, error: "Failed to save content" };
  }
}

// ─── Footer ──────────────────────────────────────────────────

export async function getFooterSettings(): Promise<
  ActionResult<{ content: string; links: FooterLink[] }>
> {
  try {
    await requireStaff();
    const map = await getSettingMap(["footerContent", "footerLinks"]);

    let links: FooterLink[] = [];
    if (map.footerLinks) {
      try {
        links = JSON.parse(map.footerLinks);
      } catch {
        /* ignore */
      }
    }

    return {
      success: true,
      data: {
        content: map.footerContent ?? "",
        links,
      },
    };
  } catch (error) {
    console.error("[branding] getFooterSettings error:", error);
    return { success: false, error: "Failed to load footer settings" };
  }
}

export async function saveFooterContent(
  html: string
): Promise<ActionResult<{ message: string }>> {
  try {
    await requireStaff();
    await upsertSetting("footerContent", html);
    return { success: true, data: { message: "Footer content saved" } };
  } catch (error) {
    console.error("[branding] saveFooterContent error:", error);
    return { success: false, error: "Failed to save footer content" };
  }
}

export async function saveFooterLinks(
  links: FooterLink[]
): Promise<ActionResult<{ message: string }>> {
  try {
    await requireStaff();
    await upsertSetting("footerLinks", JSON.stringify(links));
    return { success: true, data: { message: "Footer links saved" } };
  } catch (error) {
    console.error("[branding] saveFooterLinks error:", error);
    return { success: false, error: "Failed to save footer links" };
  }
}

// ─── Header ─────────────────────────────────────────────────

export async function getHeaderSettings(): Promise<
  ActionResult<{ links: HeaderLink[] }>
> {
  try {
    await requireStaff();
    const map = await getSettingMap(["headerLinks"]);

    let links: HeaderLink[] = [];
    if (map.headerLinks) {
      try {
        links = JSON.parse(map.headerLinks);
      } catch {
        /* ignore */
      }
    }

    return {
      success: true,
      data: { links },
    };
  } catch (error) {
    console.error("[branding] getHeaderSettings error:", error);
    return { success: false, error: "Failed to load header settings" };
  }
}

export async function saveHeaderLinks(
  links: HeaderLink[]
): Promise<ActionResult<{ message: string }>> {
  try {
    await requireStaff();
    await upsertSetting("headerLinks", JSON.stringify(links));
    return { success: true, data: { message: "Header links saved" } };
  } catch (error) {
    console.error("[branding] saveHeaderLinks error:", error);
    return { success: false, error: "Failed to save header links" };
  }
}

// ─── Dashboard Announcement ─────────────────────────────────

export async function getDashboardMessage(): Promise<
  ActionResult<{ message: string; messageId: string }>
> {
  try {
    await requireStaff();
    const map = await getSettingMap(["dashboardMessage", "dashboardMessageId"]);
    return {
      success: true,
      data: {
        message: map.dashboardMessage ?? "",
        messageId: map.dashboardMessageId ?? "",
      },
    };
  } catch (error) {
    console.error("[branding] getDashboardMessage error:", error);
    return { success: false, error: "Failed to load dashboard message" };
  }
}

export async function saveDashboardMessage(
  message: string
): Promise<ActionResult<{ message: string }>> {
  try {
    await requireStaff();
    await upsertSetting("dashboardMessage", message);
    // Generate new messageId so dismissed banners reappear
    await upsertSetting("dashboardMessageId", crypto.randomUUID());
    return { success: true, data: { message: "Dashboard message saved" } };
  } catch (error) {
    console.error("[branding] saveDashboardMessage error:", error);
    return { success: false, error: "Failed to save dashboard message" };
  }
}

// ─── Client Sidebar Links ───────────────────────────────────

export async function getClientNavLinks(): Promise<
  ActionResult<{ links: ClientNavLink[] }>
> {
  try {
    await requireStaff();
    const map = await getSettingMap(["clientNavLinks"]);

    let links: ClientNavLink[] = [];
    if (map.clientNavLinks) {
      try {
        links = JSON.parse(map.clientNavLinks);
      } catch {
        /* ignore */
      }
    }

    return { success: true, data: { links } };
  } catch (error) {
    console.error("[branding] getClientNavLinks error:", error);
    return { success: false, error: "Failed to load client nav links" };
  }
}

export async function saveClientNavLinks(
  links: ClientNavLink[]
): Promise<ActionResult<{ message: string }>> {
  try {
    await requireStaff();
    await upsertSetting("clientNavLinks", JSON.stringify(links));
    return { success: true, data: { message: "Client navigation saved" } };
  } catch (error) {
    console.error("[branding] saveClientNavLinks error:", error);
    return { success: false, error: "Failed to save client navigation" };
  }
}
