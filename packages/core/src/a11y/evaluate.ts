import type { Component, ContrastRule, DesignSystem } from "../schema/index.js";
import { resolveColor } from "../resolve/index.js";
import { contrastRatio, wcagThreshold } from "./contrast.js";

/**
 * Evaluate accessibility rules against the model. Results are DERIVED (recomputed),
 * never stored. See docs/accessibility-strategy.md.
 */

export interface ContrastResult {
  ruleId: string;
  componentId: string;
  foregroundTokenId: string;
  backgroundTokenId: string;
  level: "AA" | "AAA";
  role: "text" | "ui";
  /** computed ratio, or null when a token can't be resolved to a color */
  ratio: number | null;
  threshold: number;
  pass: boolean;
  reason?: "unresolved";
}

export function evaluateContrastRule(
  ds: DesignSystem,
  componentId: string,
  rule: ContrastRule,
): ContrastResult {
  const fg = resolveColor(ds, rule.foregroundTokenId);
  const bg = resolveColor(ds, rule.backgroundTokenId);
  const threshold = wcagThreshold(rule.level, rule.role);
  const base = {
    ruleId: rule.id,
    componentId,
    foregroundTokenId: rule.foregroundTokenId,
    backgroundTokenId: rule.backgroundTokenId,
    level: rule.level,
    role: rule.role,
    threshold,
  };
  if (fg === null || bg === null) {
    return { ...base, ratio: null, pass: false, reason: "unresolved" };
  }
  const ratio = contrastRatio(fg, bg);
  if (ratio === null) {
    return { ...base, ratio: null, pass: false, reason: "unresolved" };
  }
  return { ...base, ratio, pass: ratio >= threshold };
}

export function evaluateComponentContrast(
  ds: DesignSystem,
  component: Component,
): ContrastResult[] {
  return component.accessibility.contrast.map((rule) =>
    evaluateContrastRule(ds, component.id, rule),
  );
}

/** Evaluate every contrast rule across the whole system. */
export function evaluateAllContrast(ds: DesignSystem): ContrastResult[] {
  return ds.components.flatMap((c) => evaluateComponentContrast(ds, c));
}

export interface TargetSizeResult {
  componentId: string;
  declared: { width: number; height: number } | null;
  /** WCAG 2.2 minimum (2.5.8). */
  minimum: number;
  pass: boolean;
}

/** Check a component's declared minimum target size against WCAG 2.2 guidance (24px). */
export function checkTargetSize(component: Component): TargetSizeResult {
  const declared = component.accessibility.minTargetSize ?? null;
  const minimum = 24;
  return {
    componentId: component.id,
    declared: declared ? { width: declared.width, height: declared.height } : null,
    minimum,
    pass: declared ? declared.width >= minimum && declared.height >= minimum : true,
  };
}
