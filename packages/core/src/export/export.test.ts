import { describe, expect, it } from "vitest";
import { exportCss, exportJson, exportMarkdown, exportShadcn, exportTailwind, exportTargets } from "./index.js";
import { parseDesignSystem } from "../model/index.js";
import { createSeedDesignSystem } from "../seed/index.js";

const ds = createSeedDesignSystem();

describe("exporters are deterministic", () => {
  for (const target of exportTargets) {
    it(`${target.id} produces identical output twice`, () => {
      expect(target.run(ds)).toBe(target.run(createSeedDesignSystem()));
    });
  }
});

describe("JSON export", () => {
  it("round-trips through parse", () => {
    const reparsed = parseDesignSystem(JSON.parse(exportJson(ds)));
    expect(reparsed).toEqual(ds);
  });
});

describe("CSS export preserves aliasing + semantic names", () => {
  const css = exportCss(ds);
  it("emits semantic var names", () => {
    expect(css).toContain("--color-primary:");
    expect(css).toContain("--radius-md: 8px;");
  });
  it("keeps aliases as var() references, not flattened hex", () => {
    expect(css).toContain("--color-primary: var(--palette-blue-600);");
    expect(css).toContain("--palette-blue-600: #2448B8;");
  });
  it("expands composite typography tokens, keeping family/size refs as var()", () => {
    expect(css).toContain("--typography-heading-lg-font-family: var(--fontFamily-sans);");
    expect(css).toContain("--typography-heading-lg-font-size: var(--fontSize-xl);");
    expect(css).toContain("--typography-heading-lg-font-weight: 700;");
  });
  it("emits font-family stacks and fluid sizes as clamp()", () => {
    expect(css).toContain("--fontFamily-sans: Inter, system-ui, sans-serif;");
    expect(css).toMatch(/--fontSize-xl: clamp\(2rem, [\d.]+rem \+ [\d.]+vw, 2\.5rem\);/);
  });
});

describe("Tailwind export keeps semantic names + var() values", () => {
  const tw = exportTailwind(ds);
  it("uses semantic keys mapping to CSS vars", () => {
    expect(tw).toContain('"primary": "var(--color-primary)"');
    expect(tw).toContain('"md": "var(--radius-md)"');
  });
  it("never flattens to anonymous hex keys", () => {
    expect(tw).not.toMatch(/"2448b8"/i);
  });
});

describe("Markdown export is specific to the system", () => {
  const md = exportMarkdown(ds);
  it("includes real token names and component intent", () => {
    expect(md).toContain("# Acme UI");
    expect(md).toContain("`color.primary`");
    expect(md).toContain("### Button");
    expect(md).toContain("Trigger a single, clear action.");
  });
  it("includes computed contrast results", () => {
    expect(md).toMatch(/on color\.primary: \d+\.\d+:1 AA/);
  });
});

describe("shadcn export produces registry items", () => {
  const reg = JSON.parse(exportShadcn(ds));
  it("has one item per component with token bindings", () => {
    expect(reg.items).toHaveLength(ds.components.length);
    const button = reg.items.find((i: { name: string }) => i.name === "button");
    expect(button.type).toBe("registry:ui");
    expect(button.tokens.background).toBe("color.primary");
  });
});

describe("golden snapshots", () => {
  it("css", () => expect(exportCss(ds)).toMatchSnapshot());
  it("tailwind", () => expect(exportTailwind(ds)).toMatchSnapshot());
  it("markdown", () => expect(exportMarkdown(ds)).toMatchSnapshot());
  it("shadcn", () => expect(exportShadcn(ds)).toMatchSnapshot());
});
