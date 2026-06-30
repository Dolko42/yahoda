import { describe, expect, it } from "vitest";
import {
  PublishValidationError,
  assertPublishable,
  validateInvariants,
} from "./validate.js";
import { createSeedDesignSystem } from "../seed/index.js";

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

describe("validateInvariants", () => {
  it("passes clean on the seed system", () => {
    const report = validateInvariants(createSeedDesignSystem());
    expect(report.ok).toBe(true);
    expect(report.errors).toEqual([]);
  });

  it("detects duplicate ids", () => {
    const ds = createSeedDesignSystem();
    ds.tokens[1]!.id = ds.tokens[0]!.id;
    const report = validateInvariants(ds);
    expect(report.ok).toBe(false);
    expect(codes(report.errors)).toContain("DUPLICATE_ID");
  });

  it("detects duplicate names within a kind", () => {
    const ds = createSeedDesignSystem();
    ds.tokens[1]!.name = ds.tokens[0]!.name;
    expect(codes(validateInvariants(ds).errors)).toContain("DUPLICATE_NAME");
  });

  it("detects a dangling token alias", () => {
    const ds = createSeedDesignSystem();
    const primary = ds.tokens.find((t) => t.id === "t.color.primary")!;
    primary.value = { $ref: "t.does.not.exist" };
    expect(codes(validateInvariants(ds).errors)).toContain("DANGLING_REF");
  });

  it("detects an alias type mismatch", () => {
    const ds = createSeedDesignSystem();
    const primary = ds.tokens.find((t) => t.id === "t.color.primary")!;
    primary.value = { $ref: "t.radius.md" }; // color aliasing a dimension
    expect(codes(validateInvariants(ds).errors)).toContain("TYPE_MISMATCH");
  });

  it("detects an alias cycle", () => {
    const ds = createSeedDesignSystem();
    const a = ds.tokens.find((t) => t.id === "t.color.primary")!;
    const b = ds.tokens.find((t) => t.id === "t.color.primaryHover")!;
    a.value = { $ref: b.id };
    b.value = { $ref: a.id };
    expect(codes(validateInvariants(ds).errors)).toContain("ALIAS_CYCLE");
  });

  it("detects a dangling component binding", () => {
    const ds = createSeedDesignSystem();
    ds.components[0]!.bindings[0]!.tokenId = "t.nope";
    expect(codes(validateInvariants(ds).errors)).toContain("DANGLING_REF");
  });

  it("detects a binding/token type mismatch", () => {
    const ds = createSeedDesignSystem();
    // Button.radius should bind a dimension; point it at a color token
    const radiusBinding = ds.components[0]!.bindings.find((b) => b.property === "radius")!;
    radiusBinding.tokenId = "t.color.primary";
    expect(codes(validateInvariants(ds).errors)).toContain("BINDING_TYPE_MISMATCH");
  });

  it("detects a contrast rule referencing a non-color token", () => {
    const ds = createSeedDesignSystem();
    ds.components[0]!.accessibility.contrast[0]!.backgroundTokenId = "t.radius.md";
    expect(codes(validateInvariants(ds).errors)).toContain("CONTRAST_NOT_COLOR");
  });

  it("warns (not errors) when binding a deprecated token", () => {
    const ds = createSeedDesignSystem();
    const primary = ds.tokens.find((t) => t.id === "t.color.primary")!;
    primary.deprecated = { reason: "Use color.brand instead" };
    const report = validateInvariants(ds);
    expect(report.ok).toBe(true); // deprecation is a warning, not an error
    expect(codes(report.warnings)).toContain("USES_DEPRECATED");
  });

  it("detects a dangling pattern component reference", () => {
    const ds = createSeedDesignSystem();
    ds.patterns[0]!.composition[0]!.children![0]!.componentId = "c.ghost";
    expect(codes(validateInvariants(ds).errors)).toContain("DANGLING_REF");
  });
});

describe("assertPublishable", () => {
  it("does not throw on the seed system", () => {
    expect(() => assertPublishable(createSeedDesignSystem())).not.toThrow();
  });

  it("throws PublishValidationError on hard errors", () => {
    const ds = createSeedDesignSystem();
    ds.components[0]!.bindings[0]!.tokenId = "t.nope";
    expect(() => assertPublishable(ds)).toThrow(PublishValidationError);
  });
});
