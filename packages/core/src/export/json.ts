import type { DesignSystem } from "../schema/index.js";

/**
 * Canonical JSON serialization of the model — the portable file users import/export.
 * Round-trips: parseDesignSystem(JSON.parse(exportJson(ds))) deep-equals ds.
 */
export function exportJson(ds: DesignSystem): string {
  return JSON.stringify(ds, null, 2) + "\n";
}
