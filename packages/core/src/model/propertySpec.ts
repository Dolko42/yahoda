import type { Component, TokenType } from "../schema/index.js";
import { PROPERTY_TOKEN_TYPE } from "./validate.js";

/**
 * The editable *property surface* of a component — the design-system slots a user can
 * point at a token (Background, Text color, Padding Y, …). Properties bind to tokens
 * internally; in the UI users simply choose which token powers each property.
 *
 * The catalog is generic: archetypes (by component name) get a curated, ordered list;
 * any other component falls back to the properties already present on its bindings. The
 * required token type per property is sourced from `PROPERTY_TOKEN_TYPE` (one source).
 */

export interface PropertyDescriptor {
  /** binding property key (internal) */
  key: string;
  /** user-facing label — never the word "binding" */
  label: string;
  /** the token type a compatible token must resolve to */
  tokenType: TokenType;
  /** grouping for the recipe editor */
  group: "Color" | "Spacing" | "Shape" | "Effect" | "Typography" | "Motion";
  /** reserved for a future phase — render disabled/coming-soon */
  comingSoon?: boolean;
}

const p = (
  key: string,
  label: string,
  group: PropertyDescriptor["group"],
  comingSoon = false,
): PropertyDescriptor => {
  const tokenType = PROPERTY_TOKEN_TYPE[key];
  if (!tokenType) throw new Error(`propertySpec: no token type registered for "${key}"`);
  return comingSoon ? { key, label, tokenType, group, comingSoon } : { key, label, tokenType, group };
};

/** Curated property catalogs per component archetype (keyed by component name). */
const ARCHETYPES: Record<string, PropertyDescriptor[]> = {
  Button: [
    p("background", "Background", "Color"),
    p("color", "Text color", "Color"),
    p("borderColor", "Border color", "Color"),
    p("radius", "Radius", "Shape"),
    p("paddingX", "Padding X", "Spacing"),
    p("paddingY", "Padding Y", "Spacing"),
    p("gap", "Gap", "Spacing"),
    p("minHeight", "Min height", "Spacing"),
    p("shadow", "Shadow", "Effect"),
    p("font", "Typography", "Typography"),
    p("transition", "Transition", "Motion"),
  ],
  Card: [
    p("background", "Background", "Color"),
    p("borderColor", "Border color", "Color"),
    p("radius", "Radius", "Shape"),
    p("padding", "Padding", "Spacing"),
    p("shadow", "Shadow", "Effect"),
    p("titleTypography", "Title typography", "Typography"),
    p("bodyTypography", "Body typography", "Typography"),
  ],
  Input: [
    p("background", "Background", "Color"),
    p("color", "Text color", "Color"),
    p("placeholderColor", "Placeholder color", "Color"),
    p("borderColor", "Border color", "Color"),
    p("focusBorderColor", "Focus border color", "Color"),
    p("radius", "Radius", "Shape"),
    p("paddingX", "Padding X", "Spacing"),
    p("paddingY", "Padding Y", "Spacing"),
    p("font", "Typography", "Typography"),
  ],
  Badge: [
    p("background", "Background", "Color"),
    p("color", "Text color", "Color"),
    p("radius", "Radius", "Shape"),
    p("paddingX", "Padding X", "Spacing"),
    p("paddingY", "Padding Y", "Spacing"),
    p("font", "Typography", "Typography"),
  ],
  Alert: [
    p("background", "Background", "Color"),
    p("color", "Text color", "Color"),
    p("borderColor", "Border color", "Color"),
    p("radius", "Radius", "Shape"),
    p("padding", "Padding", "Spacing"),
    p("font", "Typography", "Typography"),
  ],
  Dialog: [
    p("background", "Background", "Color"),
    p("radius", "Radius", "Shape"),
    p("padding", "Padding", "Spacing"),
    p("shadow", "Shadow", "Effect"),
  ],
};

/** Humanize a bare property key for archetypes we don't have a catalog for. */
function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

const GROUP_OF: Record<TokenType, PropertyDescriptor["group"]> = {
  color: "Color",
  dimension: "Spacing",
  typography: "Typography",
  shadow: "Effect",
  border: "Effect",
  duration: "Motion",
  easing: "Motion",
  opacity: "Effect",
  zIndex: "Effect",
};

/**
 * The ordered editable properties for a component. Archetypes get their curated catalog,
 * plus any extra bound properties not in the catalog (appended). Unknown components derive
 * their surface from the properties their bindings already reference.
 */
export function propertiesFor(component: Component): PropertyDescriptor[] {
  const fromBindings = (key: string): PropertyDescriptor | null => {
    const tokenType = PROPERTY_TOKEN_TYPE[key];
    if (!tokenType) return null;
    return { key, label: humanize(key), tokenType, group: GROUP_OF[tokenType] };
  };

  const boundKeys = [...new Set(component.bindings.map((b) => b.property))];
  const catalog = ARCHETYPES[component.name];

  if (catalog) {
    const known = new Set(catalog.map((d) => d.key));
    const extras = boundKeys
      .filter((k) => !known.has(k))
      .map(fromBindings)
      .filter((d): d is PropertyDescriptor => d !== null);
    return [...catalog, ...extras];
  }

  return boundKeys
    .map(fromBindings)
    .filter((d): d is PropertyDescriptor => d !== null);
}
