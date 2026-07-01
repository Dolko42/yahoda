import type { DimensionValue, FluidSpec } from "../schema/index.js";

/**
 * Fluid (viewport-responsive) sizing → CSS `clamp()`.
 *
 * The size scales linearly from `min` at `minViewport` to `max` at `maxViewport`, clamped
 * outside that range. We emit the standard linear-interpolation form
 * `clamp(<min>rem, <intercept>rem + <slope>vw, <max>rem)`, computed in px then converted to
 * rem at a fixed 16px root so the output is deterministic (stable golden snapshots).
 */

/** Root font size assumed when converting px↔rem. */
export const REM_BASE = 16;

function toPx(d: DimensionValue): number {
  switch (d.unit) {
    case "px":
      return d.dimension;
    case "rem":
    case "em":
      return d.dimension * REM_BASE;
    case "%":
      // percentage of the root — best effort; fluid sizing expects px/rem in practice.
      return (d.dimension / 100) * REM_BASE;
  }
}

/** Round to 4 decimal places, dropping trailing zeros for clean, deterministic output. */
function round(n: number): number {
  return Number(n.toFixed(4));
}

const rem = (px: number): string => `${round(px / REM_BASE)}rem`;

/** Build the CSS `clamp(...)` string for a fluid spec. */
export function fluidToCss(spec: FluidSpec): string {
  const minPx = toPx(spec.min);
  const maxPx = toPx(spec.max);
  const minVw = toPx(spec.minViewport);
  const maxVw = toPx(spec.maxViewport);

  // Degenerate viewport range: no interpolation possible — fall back to the max size.
  if (maxVw === minVw) return rem(maxPx);

  const slope = (maxPx - minPx) / (maxVw - minVw); // px of size per px of viewport
  const interceptPx = minPx - minVw * slope;
  const vwCoeff = round(slope * 100); // 1vw = viewportWidth/100 px

  const lo = rem(Math.min(minPx, maxPx));
  const hi = rem(Math.max(minPx, maxPx));
  const preferred = `${rem(interceptPx)} + ${vwCoeff}vw`;
  return `clamp(${lo}, ${preferred}, ${hi})`;
}
