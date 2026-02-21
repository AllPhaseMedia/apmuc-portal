"use client";

import { useTheme } from "next-themes";

type Props = {
  logoLight: string;
  logoDark: string;
  brandName: string;
  size?: number;
};

export function BrandLogo({
  logoLight,
  logoDark,
  brandName,
  size = 32,
}: Props) {
  const { resolvedTheme } = useTheme();

  const src = resolvedTheme === "dark" && logoDark ? logoDark : logoLight;

  if (!src) {
    // Fallback: letter square
    return (
      <div
        className="flex items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm"
        style={{ width: size, height: size }}
      >
        {brandName.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={brandName}
      width={size}
      height={size}
      className="rounded-md object-contain"
    />
  );
}
