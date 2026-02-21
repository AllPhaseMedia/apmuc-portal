import { getBranding } from "@/lib/branding";

export async function BrandStyleInjection() {
  const branding = await getBranding();

  const overrides: string[] = [];

  if (branding.colorPrimary) {
    overrides.push(`--primary: ${branding.colorPrimary};`);
    overrides.push(`--ring: ${branding.colorPrimary};`);
    overrides.push(`--chart-1: ${branding.colorPrimary};`);
    overrides.push(`--sidebar-primary: ${branding.colorPrimary};`);
    overrides.push(`--sidebar-ring: ${branding.colorPrimary};`);
  }

  if (branding.colorSidebar) {
    overrides.push(`--sidebar: ${branding.colorSidebar};`);
  }

  if (overrides.length === 0) return null;

  const css = `:root { ${overrides.join(" ")} }`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
