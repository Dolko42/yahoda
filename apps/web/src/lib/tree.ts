import type { DesignSystem, NodeKind, Token } from "@yahoda/core";

/** A selectable item in the sidebar. */
export interface TreeItem {
  kind: NodeKind;
  id: string;
  label: string;
  sub?: string;
}

export interface TreeGroup {
  label: string;
  items: TreeItem[];
}

export interface TreeSection {
  label: string;
  groups: TreeGroup[];
}

/** Canonical token sub-section for the sidebar, derived from token type/name. */
function tokenSection(t: Token): string {
  switch (t.type) {
    case "color":
      return "Colors";
    case "typography":
      return "Typography";
    case "dimension":
      return t.name.startsWith("radius") ? "Radius" : "Spacing";
    case "shadow":
      return "Shadows / Elevation";
    case "duration":
    case "easing":
      return "Motion";
    default:
      return "Other";
  }
}

const TOKEN_SECTION_ORDER = [
  "Colors",
  "Typography",
  "Spacing",
  "Radius",
  "Shadows / Elevation",
  "Motion",
  "Other",
];

export function buildTree(ds: DesignSystem): TreeSection[] {
  // tokens grouped into canonical sub-sections
  const tokenGroups = new Map<string, TreeItem[]>();
  for (const t of ds.tokens) {
    const section = tokenSection(t);
    const items = tokenGroups.get(section) ?? [];
    items.push({ kind: "token", id: t.id, label: t.name, sub: t.tier });
    tokenGroups.set(section, items);
  }
  const tokenSubGroups: TreeGroup[] = TOKEN_SECTION_ORDER.filter((s) =>
    tokenGroups.has(s),
  ).map((label) => ({ label, items: tokenGroups.get(label)! }));

  const sections: TreeSection[] = [
    { label: "Design Tokens", groups: tokenSubGroups },
    {
      label: "Components",
      groups: [
        {
          label: "Components",
          items: ds.components.map((c) => ({
            kind: "component" as const,
            id: c.id,
            label: c.name,
            sub: c.status,
          })),
        },
      ],
    },
    {
      label: "Patterns",
      groups: [
        {
          label: "Patterns",
          items: ds.patterns.map((p) => ({
            kind: "pattern" as const,
            id: p.id,
            label: p.name,
          })),
        },
      ],
    },
    {
      label: "Documentation",
      groups: [
        {
          label: "Documentation",
          items: ds.docs.map((d) => ({
            kind: "doc" as const,
            id: d.id,
            label: d.title,
          })),
        },
      ],
    },
  ];

  return sections;
}
