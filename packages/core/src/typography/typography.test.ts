import { describe, expect, it } from "vitest";
import type { Token } from "../schema/index.js";
import { createSeedDesignSystem } from "../seed/index.js";
import { deleteTokenSafely, reassignToken, updateToken, validateInvariants } from "../model/index.js";
import { getDependents } from "../graph/index.js";
import {
  getCompatibleTypographyTokens,
  getFontFamilyUsages,
  getTypographyChildren,
  getTypographyParent,
  groupTypographyStylesByRole,
  isFontFamilyToken,
  isTypographyBaseToken,
  isTypographySemanticToken,
  parseTypographyName,
  resolveFontFamily,
  resolveTypographyToken,
  validateTypographyValue,
} from "./typography.js";

const meta = { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

describe("classification", () => {
  const ds = createSeedDesignSystem();
  const byId = (id: string) => ds.tokens.find((t) => t.id === id)!;

  it("classifies font, base, and semantic tokens", () => {
    expect(isFontFamilyToken(byId("t.font.heading"))).toBe(true);
    expect(isTypographyBaseToken(byId("t.type.heading.base"))).toBe(true);
    expect(isTypographySemanticToken(byId("t.type.heading.base"))).toBe(false);
    expect(isTypographySemanticToken(byId("t.type.heading.lg"))).toBe(true);
    expect(isFontFamilyToken(byId("t.type.heading.lg"))).toBe(false);
  });

  it("parses style names into role/size", () => {
    expect(parseTypographyName("typography.heading.lg")).toEqual({ role: "heading", size: "lg" });
    expect(parseTypographyName("typography.caption")).toEqual({ role: "caption", size: null });
    expect(parseTypographyName("nope")).toBeNull();
  });

  it("groups semantic styles by role in specimen order", () => {
    const groups = groupTypographyStylesByRole(ds.tokens);
    expect(groups.map((g) => g.role)).toEqual([
      "display", "heading", "body", "label", "link", "caption", "eyebrow",
    ]);
    expect(groups.find((g) => g.role === "heading")!.tokens.map((t) => t.name)).toEqual([
      "typography.heading.lg",
      "typography.heading.md",
      "typography.heading.sm",
      "typography.heading.xl",
    ]);
  });

  it("lists only semantic styles as bindable", () => {
    const compatible = getCompatibleTypographyTokens(ds);
    expect(compatible.some((t) => t.name === "typography.heading.base")).toBe(false);
    expect(compatible.some((t) => t.name === "typography.label.md")).toBe(true);
  });
});

describe("resolution & inheritance", () => {
  it("merges base defaults with local overrides (local wins)", () => {
    const ds = createSeedDesignSystem();
    const r = resolveTypographyToken(ds, "t.type.heading.lg");
    expect(r.ok).toBe(true);
    expect(r.style.fontFamily).toBe('"Inter Tight", "Inter", system-ui, sans-serif');
    expect(r.style.fontSize).toBe("2rem"); // own override
    expect(r.style.fontWeight).toBe(700); // inherited from heading.base
    expect(r.style.lineHeight).toBe(1.15); // inherited
    expect(r.style.letterSpacing).toBe("-0.02em"); // inherited
    expect(r.sources.fontSize).toEqual({ source: "own", tokenId: "t.type.heading.lg" });
    expect(r.sources.fontWeight).toEqual({ source: "inherited", tokenId: "t.type.heading.base" });
    expect(r.chain).toEqual(["t.type.heading.lg", "t.type.heading.base"]);
  });

  it("lets a semantic style override an inherited field", () => {
    const ds = createSeedDesignSystem();
    const r = resolveTypographyToken(ds, "t.type.heading.sm");
    expect(r.style.fontWeight).toBe(600); // own, beats base's 700
    expect(r.sources.fontWeight.source).toBe("own");
  });

  it("fills unset fields with defaults (base style alone)", () => {
    const ds = createSeedDesignSystem();
    const r = resolveTypographyToken(ds, "t.type.body.base");
    expect(r.ok).toBe(true);
    expect(r.style.fontSize).toBe("1rem"); // default — base defines no size
    expect(r.sources.fontSize.source).toBe("default");
    expect(r.style.textTransform).toBe("none");
  });

  it("cascades a font stack change to every style using it", () => {
    let ds = createSeedDesignSystem();
    ds = updateToken(ds, "t.font.heading", { value: { fontFamily: "Georgia, serif" } });
    expect(resolveTypographyToken(ds, "t.type.display.xl").style.fontFamily).toBe("Georgia, serif");
    expect(resolveTypographyToken(ds, "t.type.heading.md").style.fontFamily).toBe("Georgia, serif");
    // body styles keep their own font
    expect(resolveTypographyToken(ds, "t.type.body.md").style.fontFamily).toContain("Inter");
  });

  it("resolves uppercase transform on the eyebrow style", () => {
    const ds = createSeedDesignSystem();
    const r = resolveTypographyToken(ds, "t.type.eyebrow");
    expect(r.style.textTransform).toBe("uppercase");
    expect(r.style.letterSpacing).toBe("0.08em");
  });

  it("survives a missing parent (usable style + issue)", () => {
    const ds = createSeedDesignSystem();
    ds.tokens.push({
      id: "t.type.orphan", name: "typography.orphan", type: "typography", tier: "semantic",
      value: { typography: { extends: { $ref: "t.type.gone" }, fontSize: { dimension: 1, unit: "rem" } } },
      meta,
    } as Token);
    const r = resolveTypographyToken(ds, "t.type.orphan");
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toContain("missing parent");
    expect(r.style.fontSize).toBe("1rem"); // own field still applies
  });

  it("survives an inheritance cycle without looping", () => {
    const ds = createSeedDesignSystem();
    ds.tokens.push(
      { id: "t.a", name: "typography.a", type: "typography", tier: "semantic",
        value: { typography: { extends: { $ref: "t.b" } } }, meta } as Token,
      { id: "t.b", name: "typography.b", type: "typography", tier: "semantic",
        value: { typography: { extends: { $ref: "t.a" } } }, meta } as Token,
    );
    const r = resolveTypographyToken(ds, "t.a");
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toContain("cycle");
  });

  it("resolves a font family token to its stack", () => {
    const ds = createSeedDesignSystem();
    expect(resolveFontFamily(ds, "t.font.mono")).toBe('"JetBrains Mono", ui-monospace, monospace');
    expect(resolveFontFamily(ds, "t.color.primary")).toBeNull();
  });
});

describe("parents, children, usages", () => {
  const ds = createSeedDesignSystem();

  it("finds the direct parent and children of a base style", () => {
    expect(getTypographyParent(ds, "t.type.heading.lg")?.id).toBe("t.type.heading.base");
    expect(getTypographyParent(ds, "t.type.heading.base")).toBeNull();
    const children = getTypographyChildren(ds, "t.type.heading.base").map((t) => t.name);
    expect(children).toContain("typography.heading.lg");
    expect(children).toContain("typography.display.xl");
  });

  it("finds every style whose effective font resolves through a font token", () => {
    const heading = getFontFamilyUsages(ds, "t.font.heading").map((t) => t.name);
    expect(heading).toContain("typography.heading.base");
    expect(heading).toContain("typography.heading.lg"); // inherited through the base
    expect(heading).not.toContain("typography.body.md");
    expect(getFontFamilyUsages(ds, "t.font.mono")).toEqual([]);
  });

  it("exposes font/parent references in the dependency graph", () => {
    const fontDeps = getDependents(ds, "t.font.heading").map((r) => r.id);
    expect(fontDeps).toContain("t.type.heading.base");
    const baseDeps = getDependents(ds, "t.type.heading.base").map((r) => r.id);
    expect(baseDeps).toContain("t.type.heading.lg");
  });
});

describe("safe deletion & reassignment", () => {
  it("refuses to delete a used font without a reassignment target", () => {
    const ds = createSeedDesignSystem();
    expect(() => deleteTokenSafely(ds, "t.font.heading")).toThrow(/in use/);
  });

  it("rewrites nested typography refs when reassigning a font", () => {
    let ds = createSeedDesignSystem();
    ds = reassignToken(ds, "t.font.heading", "t.font.body");
    const base = ds.tokens.find((t) => t.id === "t.type.heading.base")!;
    expect("typography" in base.value && (base.value.typography.fontFamily as { $ref: string }).$ref)
      .toBe("t.font.body");
    expect(validateInvariants(ds).ok).toBe(true);
  });

  it("rewrites extends refs when reassigning a base style, then deletes cleanly", () => {
    let ds = createSeedDesignSystem();
    ds = deleteTokenSafely(ds, "t.type.link.base", { reassignTo: "t.type.label.base" });
    const link = ds.tokens.find((t) => t.id === "t.type.link.md")!;
    expect("typography" in link.value && link.value.typography.extends?.$ref)
      .toBe("t.type.label.base");
    expect(ds.tokens.some((t) => t.id === "t.type.link.base")).toBe(false);
    expect(validateInvariants(ds).ok).toBe(true);
  });
});

describe("validation", () => {
  it("accepts the seed", () => {
    expect(validateInvariants(createSeedDesignSystem()).ok).toBe(true);
  });

  it("flags a dangling extends and a non-typography parent", () => {
    const ds = createSeedDesignSystem();
    ds.tokens.push(
      { id: "t.bad1", name: "typography.bad1", type: "typography", tier: "semantic",
        value: { typography: { extends: { $ref: "t.nope" } } }, meta } as Token,
      { id: "t.bad2", name: "typography.bad2", type: "typography", tier: "semantic",
        value: { typography: { extends: { $ref: "t.color.primary" } } }, meta } as Token,
    );
    const report = validateInvariants(ds);
    expect(report.errors.some((e) => e.code === "DANGLING_REF" && e.nodeId === "t.bad1")).toBe(true);
    expect(report.errors.some((e) => e.code === "TYPE_MISMATCH" && e.nodeId === "t.bad2")).toBe(true);
  });

  it("flags an extends cycle and a non-font fontFamily ref", () => {
    const ds = createSeedDesignSystem();
    ds.tokens.push(
      { id: "t.a", name: "typography.a", type: "typography", tier: "semantic",
        value: { typography: { extends: { $ref: "t.b" } } }, meta } as Token,
      { id: "t.b", name: "typography.b", type: "typography", tier: "semantic",
        value: { typography: { extends: { $ref: "t.a" } } }, meta } as Token,
      { id: "t.c", name: "typography.c", type: "typography", tier: "semantic",
        value: { typography: { fontFamily: { $ref: "t.color.primary" } } }, meta } as Token,
    );
    const report = validateInvariants(ds);
    expect(report.errors.some((e) => e.code === "EXTENDS_CYCLE")).toBe(true);
    expect(report.errors.some((e) => e.code === "TYPE_MISMATCH" && e.nodeId === "t.c")).toBe(true);
  });

  it("validates form-level typography numbers", () => {
    expect(validateTypographyValue({})).toEqual([]);
    expect(validateTypographyValue({ fontSize: 1, lineHeight: 1.5, fontWeight: 400 })).toEqual([]);
    expect(validateTypographyValue({ fontSize: -1 })).toHaveLength(1);
    expect(validateTypographyValue({ lineHeight: 0 })).toHaveLength(1);
    expect(validateTypographyValue({ fontWeight: 1001 })).toHaveLength(1);
    expect(validateTypographyValue({ letterSpacing: Number.NaN })).toHaveLength(1);
  });
});
