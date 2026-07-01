import { parseColor } from "../a11y/contrast.js";

/**
 * Deterministic primitive color-scale generation. Pure, dependency-free (no AI, no
 * color-science libs). Given one anchor hex and its step, produce a full 100–900 scale by
 * ramping lightness in HSL while preserving the anchor's hue and saturation. The anchor
 * step keeps its exact input hex; every other step is derived. Good enough for the MVP —
 * users can hand-edit any generated shade afterward.
 */

export const DEFAULT_SCALE_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

/** Lightness (0..1) the lightest / darkest ends of a scale approach. */
const LIGHT_END = 0.97;
const DARK_END = 0.13;

export interface HSL {
  h: number; // 0..360
  s: number; // 0..1
  l: number; // 0..1
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

export function hslToHex({ h, s, l }: HSL): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to255 = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to255(r)}${to255(g)}${to255(b)}`.toUpperCase();
}

/** Convert a hex/rgb string to HSL, or null if it can't be parsed. */
export function hexToHsl(input: string): HSL | null {
  const rgb = parseColor(input);
  if (!rgb) return null;
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

/**
 * Generate a step→hex color scale from a single anchor color. The anchor step keeps its
 * exact input hex; every other step shares the anchor's hue and saturation and interpolates
 * lightness from the anchor's own lightness toward a near-white end (lower steps) or a
 * near-black end (higher steps). Pinning the ramp to the anchor's real lightness keeps the
 * anchor exact while the scale stays monotonic. Returns an ordered array so callers can
 * create tokens in order.
 */
export function generateColorScale(
  anchorHex: string,
  anchorStep = 500,
  steps: readonly number[] = DEFAULT_SCALE_STEPS,
): { step: number; hex: string }[] {
  const hsl = hexToHsl(anchorHex);
  if (steps.length === 0 || !hsl) return [];
  const normalizedAnchor = anchorHex.trim().toUpperCase();
  const minStep = Math.min(...steps);
  const maxStep = Math.max(...steps);

  return steps.map((step) => {
    if (step === anchorStep) return { step, hex: normalizedAnchor };
    let l: number;
    if (step < anchorStep) {
      const span = anchorStep - minStep;
      const t = span > 0 ? (anchorStep - step) / span : 0;
      l = hsl.l + (LIGHT_END - hsl.l) * t;
    } else {
      const span = maxStep - anchorStep;
      const t = span > 0 ? (step - anchorStep) / span : 0;
      l = hsl.l + (DARK_END - hsl.l) * t;
    }
    return { step, hex: hslToHex({ h: hsl.h, s: hsl.s, l }) };
  });
}
