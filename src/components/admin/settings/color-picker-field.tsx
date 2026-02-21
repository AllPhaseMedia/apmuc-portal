"use client";

import { useCallback, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

type Props = {
  label: string;
  value: string; // OKLCh string
  onChange: (oklch: string) => void;
  defaultValue?: string;
};

function hexToOklch(hex: string): string {
  // Convert hex to sRGB
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // sRGB to linear
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  // Linear RGB to CIEXYZ (D65)
  const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
  const z = 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb;

  // XYZ to OKLab
  const l_ = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
  const m_ = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
  const s_ = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bOk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  // OKLab to OKLCh
  const C = Math.sqrt(a * a + bOk * bOk);
  let h = (Math.atan2(bOk, a) * 180) / Math.PI;
  if (h < 0) h += 360;

  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${h.toFixed(1)})`;
}

function oklchToHex(oklch: string): string {
  const match = oklch.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/);
  if (!match) return "#ff8800";

  const L = parseFloat(match[1]);
  const C = parseFloat(match[2]);
  const h = (parseFloat(match[3]) * Math.PI) / 180;

  // OKLCh to OKLab
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  // OKLab to linear sRGB (via LMS)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  let lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  // linear to sRGB
  const toSrgb = (c: number) =>
    c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

  lr = Math.max(0, Math.min(1, toSrgb(lr)));
  lg = Math.max(0, Math.min(1, toSrgb(lg)));
  lb = Math.max(0, Math.min(1, toSrgb(lb)));

  const toHex = (c: number) =>
    Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(lr)}${toHex(lg)}${toHex(lb)}`;
}

export function ColorPickerField({ label, value, onChange, defaultValue }: Props) {
  const [hexValue, setHexValue] = useState(() => (value ? oklchToHex(value) : "#ff8800"));

  const handleColorChange = useCallback(
    (hex: string) => {
      setHexValue(hex);
      onChange(hexToOklch(hex));
    },
    [onChange]
  );

  const handleReset = useCallback(() => {
    onChange(defaultValue ?? "");
    setHexValue(defaultValue ? oklchToHex(defaultValue) : "#ff8800");
  }, [onChange, defaultValue]);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <Input
          type="color"
          value={hexValue}
          onChange={(e) => handleColorChange(e.target.value)}
          className="h-10 w-14 cursor-pointer p-1"
        />
        <div
          className="h-10 w-10 rounded-md border"
          style={{ backgroundColor: value || hexValue }}
        />
        <code className="text-xs text-muted-foreground">
          {value || "(default)"}
        </code>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            title="Reset to default"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
