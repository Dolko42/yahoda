import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Architectural law: packages/core is framework-free. No React/Next/DOM imports.
 * This test fails loudly if anyone reaches for them here. See docs/architecture.md.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)));
const BANNED = [/from\s+["']react["']/, /from\s+["']react-dom/, /from\s+["']next/];

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...tsFiles(full));
    else if (extname(full) === ".ts") out.push(full);
  }
  return out;
}

describe("core framework-free boundary", () => {
  it("contains no React/Next imports", () => {
    const offenders: string[] = [];
    for (const file of tsFiles(SRC)) {
      const text = readFileSync(file, "utf8");
      if (BANNED.some((re) => re.test(text))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
