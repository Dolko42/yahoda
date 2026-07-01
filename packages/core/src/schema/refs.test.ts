import { describe, expect, it } from "vitest";
import type { TokenValue } from "./tokens.js";
import { collectRefs } from "./refs.js";

describe("collectRefs", () => {
  it("returns a top-level alias ref", () => {
    expect(collectRefs({ $ref: "t.a" })).toEqual(["t.a"]);
  });

  it("finds nested typography refs (fontFamily + fontSize) and ignores literals", () => {
    const v: TokenValue = {
      typography: {
        fontFamily: { $ref: "t.family.sans" },
        fontSize: { $ref: "t.size.lg" },
        lineHeight: 1.4,
        fontWeight: 600,
      },
    };
    expect(collectRefs(v).sort()).toEqual(["t.family.sans", "t.size.lg"]);
  });

  it("ignores literal font family strings and fluid font sizes", () => {
    const v: TokenValue = {
      typography: {
        fontFamily: "Inter",
        fontSize: {
          fluid: {
            min: { dimension: 1, unit: "rem" },
            max: { dimension: 1.5, unit: "rem" },
            minViewport: { dimension: 320, unit: "px" },
            maxViewport: { dimension: 1240, unit: "px" },
          },
        },
        lineHeight: 1.5,
        fontWeight: 400,
      },
    };
    expect(collectRefs(v)).toEqual([]);
  });

  it("finds shadow and border color/width refs", () => {
    const shadow: TokenValue = {
      shadow: [
        {
          x: { dimension: 0, unit: "px" },
          y: { dimension: 1, unit: "px" },
          blur: { dimension: 2, unit: "px" },
          spread: { dimension: 0, unit: "px" },
          color: { $ref: "t.color.shadow" },
        },
      ],
    };
    expect(collectRefs(shadow)).toEqual(["t.color.shadow"]);

    const border: TokenValue = {
      border: { width: { $ref: "t.size.hair" }, style: "solid", color: { $ref: "t.color.line" } },
    };
    expect(collectRefs(border)).toEqual(["t.size.hair", "t.color.line"]);
  });

  it("returns nothing for plain scalar values", () => {
    expect(collectRefs({ color: "#fff" })).toEqual([]);
    expect(collectRefs({ dimension: 8, unit: "px" })).toEqual([]);
    expect(collectRefs({ fontFamily: "Inter, sans-serif" })).toEqual([]);
  });
});
