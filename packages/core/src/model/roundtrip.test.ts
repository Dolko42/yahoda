import { describe, expect, it } from "vitest";
import { parseDesignSystem } from "./parse.js";
import { seedDesignSystem } from "../seed/index.js";

describe("serialization round-trip", () => {
  it("parse(serialize(seed)) deep-equals the seed", () => {
    const serialized = JSON.stringify(seedDesignSystem);
    const reparsed = parseDesignSystem(JSON.parse(serialized));
    expect(reparsed).toEqual(seedDesignSystem);
  });

  it("is idempotent across two round-trips", () => {
    const once = parseDesignSystem(JSON.parse(JSON.stringify(seedDesignSystem)));
    const twice = parseDesignSystem(JSON.parse(JSON.stringify(once)));
    expect(twice).toEqual(once);
  });
});
