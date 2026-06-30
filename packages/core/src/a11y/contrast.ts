/**
 * WCAG 2.x contrast math. Pure, dependency-free. Tested against known reference pairs.
 * Supports #rgb / #rrggbb / #rrggbbaa hex and rgb()/rgba() strings. Colors with alpha
 * are composited over an opaque backdrop (default white) since WCAG assumes opaque.
 */

export interface RGB {
  r: number; // 0..255
  g: number;
  b: number;
  a: number; // 0..1
}

export function parseColor(input: string): RGB | null {
  const s = input.trim().toLowerCase();

  if (s.startsWith("#")) {
    const hex = s.slice(1);
    const read = (h: string) => parseInt(h, 16);
    if (hex.length === 3 || hex.length === 4) {
      const r = read(hex[0]! + hex[0]!);
      const g = read(hex[1]! + hex[1]!);
      const b = read(hex[2]! + hex[2]!);
      const a = hex.length === 4 ? read(hex[3]! + hex[3]!) / 255 : 1;
      return { r, g, b, a };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = read(hex.slice(0, 2));
      const g = read(hex.slice(2, 4));
      const b = read(hex.slice(4, 6));
      const a = hex.length === 8 ? read(hex.slice(6, 8)) / 255 : 1;
      if ([r, g, b].some(Number.isNaN)) return null;
      return { r, g, b, a };
    }
    return null;
  }

  const m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1]!.split(/[,/\s]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const r = Number(parts[0]);
    const g = Number(parts[1]);
    const b = Number(parts[2]);
    const a = parts[3] !== undefined ? Number(parts[3]) : 1;
    if ([r, g, b, a].some(Number.isNaN)) return null;
    return { r, g, b, a };
  }

  return null;
}

/** Composite a possibly-translucent color over an opaque backdrop. */
function flatten(c: RGB, backdrop: RGB): RGB {
  if (c.a >= 1) return c;
  const mix = (fg: number, bg: number) => Math.round(fg * c.a + bg * (1 - c.a));
  return { r: mix(c.r, backdrop.r), g: mix(c.g, backdrop.g), b: mix(c.b, backdrop.b), a: 1 };
}

/** WCAG relative luminance of an opaque sRGB color. */
export function relativeLuminance(c: RGB): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/**
 * WCAG contrast ratio between two colors (1..21). Returns null if either is unparsable.
 * Translucent colors are flattened over `backdrop` (default white).
 */
export function contrastRatio(
  fg: string,
  bg: string,
  backdrop = "#FFFFFF",
): number | null {
  const f = parseColor(fg);
  const b = parseColor(bg);
  const back = parseColor(backdrop) ?? { r: 255, g: 255, b: 255, a: 1 };
  if (!f || !b) return null;
  const l1 = relativeLuminance(flatten(f, back));
  const l2 = relativeLuminance(flatten(b, back));
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastLevel = "AA" | "AAA";
export type ContrastRole = "text" | "ui";

/** Required minimum ratio for a level/role (large-text variants modeled in Phase 9). */
export function wcagThreshold(level: ContrastLevel, role: ContrastRole): number {
  if (role === "ui") return 3;
  return level === "AAA" ? 7 : 4.5;
}
