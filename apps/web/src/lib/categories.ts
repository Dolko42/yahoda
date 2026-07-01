import type { Token, TokenType } from "@yahoda/core";

/**
 * System categories drive both the inline section tab bar (above the canvas) and the
 * sidebar's content (search + grouped items + "+ New"). The active category lives in the
 * workspace store so the tab bar and sidebar stay in sync. This is the single source of
 * truth for what each category contains — keep it UI-only (no data-model concerns here).
 */

export type CategoryId =
  | "colors"
  | "typography"
  | "spacing"
  | "radius"
  | "effects"
  | "motion"
  | "components";

export interface CreateCfg {
  type: TokenType;
  namePrefix: string;
  group: string;
  /** button label, e.g. "Text style" */
  label: string;
}

export interface TokenGroup {
  label: string;
  filter: (t: Token) => boolean;
}

export interface Category {
  id: CategoryId;
  label: string;
  /** one or more "+ New" actions; empty for the component category */
  creates: CreateCfg[];
  match?: (t: Token) => boolean;
  /** optional sub-grouping of the list (falls back to tier/flat) */
  groups?: TokenGroup[];
}

export const CATEGORIES: Category[] = [
  { id: "colors", label: "Colors",
    creates: [{ type: "color", namePrefix: "color", group: "Brand", label: "Color" }],
    match: (t) => t.type === "color" },
  { id: "typography", label: "Typography",
    creates: [{ type: "typography", namePrefix: "typography", group: "Typography", label: "Text style" }],
    match: (t) => t.type === "typography" },
  { id: "spacing", label: "Spacing",
    creates: [{ type: "dimension", namePrefix: "spacing", group: "Spacing", label: "Spacing" }],
    match: (t) => t.type === "dimension" && !t.name.startsWith("radius") },
  { id: "radius", label: "Radius",
    creates: [{ type: "dimension", namePrefix: "radius", group: "Radius", label: "Radius" }],
    match: (t) => t.type === "dimension" && t.name.startsWith("radius") },
  { id: "effects", label: "Effects",
    creates: [{ type: "shadow", namePrefix: "shadow", group: "Elevation", label: "Shadow" }],
    match: (t) => ["shadow", "border", "opacity"].includes(t.type) },
  { id: "motion", label: "Motion",
    creates: [{ type: "duration", namePrefix: "duration", group: "Motion", label: "Duration" }],
    match: (t) => ["duration", "easing"].includes(t.type) },
  { id: "components", label: "Components", creates: [] },
];
