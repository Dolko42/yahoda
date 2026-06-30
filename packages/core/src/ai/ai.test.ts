import { describe, expect, it } from "vitest";
import { buildAIContext, renderAIContextMarkdown } from "./context.js";
import { findStaleRules, staleRulesFor } from "./staleness.js";
import { updateToken } from "../model/index.js";
import { commit } from "../version/index.js";
import { createSeedDesignSystem } from "../seed/index.js";

describe("buildAIContext", () => {
  const ctx = buildAIContext(createSeedDesignSystem());

  it("is system-specific: real token names + resolved values", () => {
    const primary = ctx.tokens.find((t) => t.name === "color.primary");
    expect(primary?.value).toBe("#2448B8"); // resolved through the alias
    expect(primary?.tier).toBe("semantic");
  });

  it("includes components with intent, token map, do/avoid, contrast, code", () => {
    const button = ctx.components.find((c) => c.name === "Button")!;
    expect(button.intent).toContain("Trigger");
    expect(button.tokens.background).toBe("color.primary");
    expect(button.do.length).toBeGreaterThan(0);
    expect(button.avoid.length).toBeGreaterThan(0);
    expect(button.accessibility.contrast[0]).toMatch(/color\.textOnPrimary on color\.primary = \d/);
    expect(button.code).toContain("Button");
  });

  it("includes patterns with their component composition", () => {
    const auth = ctx.patterns.find((p) => p.name === "Auth form")!;
    expect(auth.components).toEqual(expect.arrayContaining(["Button", "Input"]));
  });

  it("carries provenance + a content hash", () => {
    expect(ctx.system.name).toBe("Acme UI");
    expect(ctx.system.contentHash).toMatch(/^h_[0-9a-f]{8}$/);
  });
});

describe("contentHash behaviour", () => {
  it("is stable across regenerations of the same system", () => {
    const a = buildAIContext(createSeedDesignSystem());
    const b = buildAIContext(createSeedDesignSystem());
    expect(a.system.contentHash).toBe(b.system.contentHash);
    expect(a).toEqual(b); // fully deterministic
  });

  it("changes when content changes", () => {
    const base = buildAIContext(createSeedDesignSystem());
    const edited = buildAIContext(
      updateToken(createSeedDesignSystem(), "t.blue.600", { value: { color: "#000000" } }),
    );
    expect(edited.system.contentHash).not.toBe(base.system.contentHash);
  });
});

describe("renderAIContextMarkdown", () => {
  const md = renderAIContextMarkdown(buildAIContext(createSeedDesignSystem()));
  it("is specific and instructive", () => {
    expect(md).toContain("# AI context — Acme UI");
    expect(md).toContain("### Button");
    expect(md).toContain("Do not invent components");
    expect(md).toContain("`color.primary`");
  });
  it("matches the golden snapshot", () => {
    expect(md).toMatchSnapshot();
  });
});

describe("findStaleRules", () => {
  it("returns nothing for a never-published system", () => {
    expect(findStaleRules(createSeedDesignSystem())).toEqual([]);
  });

  it("returns nothing right after publishing (nothing changed)", () => {
    const published = commit(createSeedDesignSystem(), "v1", { id: "c1", now: "2026-03-01T00:00:00.000Z" });
    expect(findStaleRules(published)).toEqual([]);
  });

  it("flags a rule when a linked token changes after publish", () => {
    const published = commit(createSeedDesignSystem(), "v1", { id: "c1", now: "2026-03-01T00:00:00.000Z" });
    // Button.aiRules.linkedTokens includes t.color.primary
    const edited = updateToken(published, "t.color.primary", { value: { $ref: "t.blue.700" } });
    const stale = findStaleRules(edited);
    const button = stale.find((s) => s.ownerName === "Button");
    expect(button).toBeDefined();
    expect(button!.changedNames).toContain("color.primary");
    expect(staleRulesFor(edited, "c.button")).toBeDefined();
  });

  it("does not flag when an unlinked token changes", () => {
    const published = commit(createSeedDesignSystem(), "v1", { id: "c1", now: "2026-03-01T00:00:00.000Z" });
    // spacing.6 is not in any aiRules.linkedTokens
    const edited = updateToken(published, "t.spacing.6", { value: { dimension: 32, unit: "px" } });
    expect(findStaleRules(edited)).toEqual([]);
  });
});
