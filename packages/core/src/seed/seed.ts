import type {
  Component,
  DesignSystem,
  DocNode,
  NodeMeta,
  Pattern,
  Token,
} from "../schema/index.js";
import { SCHEMA_VERSION } from "../schema/index.js";

/**
 * Seed design system: the MVP fixture used by tests and as the initial workspace
 * content. A realistic example *previewed* system (its own colors) — distinct from the
 * neutral app chrome. Deterministic timestamps keep round-trip/golden tests stable.
 */

const NOW = "2026-01-01T00:00:00.000Z";
const meta: NodeMeta = { createdAt: NOW, updatedAt: NOW };

// --- tokens ----------------------------------------------------------------

const tokens: Token[] = [
  // primitives — color
  { id: "t.blue.600", name: "palette.blue.600", type: "color", tier: "primitive",
    value: { color: "#2448B8" }, group: "Palette", meta },
  { id: "t.blue.700", name: "palette.blue.700", type: "color", tier: "primitive",
    value: { color: "#1E3FA0" }, group: "Palette", meta },
  { id: "t.slate.900", name: "palette.slate.900", type: "color", tier: "primitive",
    value: { color: "#181A1D" }, group: "Palette", meta },
  { id: "t.slate.300", name: "palette.slate.300", type: "color", tier: "primitive",
    value: { color: "#C4C9D1" }, group: "Palette", meta },
  { id: "t.white", name: "palette.white", type: "color", tier: "primitive",
    value: { color: "#FFFFFF" }, group: "Palette", meta },
  { id: "t.red.600", name: "palette.red.600", type: "color", tier: "primitive",
    value: { color: "#C0341D" }, group: "Palette", meta },

  // semantic — color
  { id: "t.color.primary", name: "color.primary", type: "color", tier: "semantic",
    value: { $ref: "t.blue.600" }, usage: "Primary actions and brand emphasis.",
    group: "Brand", meta },
  { id: "t.color.primaryHover", name: "color.primaryHover", type: "color", tier: "semantic",
    value: { $ref: "t.blue.700" }, usage: "Hover/active state of primary surfaces.",
    group: "Brand", meta },
  { id: "t.color.surface", name: "color.surface", type: "color", tier: "semantic",
    value: { $ref: "t.white" }, usage: "Default surface/background for components.",
    group: "Surface", meta },
  { id: "t.color.text", name: "color.text", type: "color", tier: "semantic",
    value: { $ref: "t.slate.900" }, usage: "Default body text color.", group: "Text", meta },
  { id: "t.color.textOnPrimary", name: "color.textOnPrimary", type: "color", tier: "semantic",
    value: { $ref: "t.white" }, usage: "Text/icon color on primary surfaces.",
    group: "Text", meta },
  { id: "t.color.border", name: "color.border", type: "color", tier: "semantic",
    value: { $ref: "t.slate.300" }, usage: "Default border/divider color.",
    group: "Surface", meta },
  { id: "t.color.danger", name: "color.danger", type: "color", tier: "semantic",
    value: { $ref: "t.red.600" }, usage: "Destructive/error emphasis.", group: "Status", meta },
  { id: "t.color.transparent", name: "color.transparent", type: "color", tier: "semantic",
    value: { color: "transparent" }, usage: "No fill — e.g. ghost button background.",
    group: "Surface", meta },

  // radius
  { id: "t.radius.sm", name: "radius.sm", type: "dimension", tier: "semantic",
    value: { dimension: 4, unit: "px" }, usage: "Inputs, badges, small controls.",
    group: "Radius", meta },
  { id: "t.radius.md", name: "radius.md", type: "dimension", tier: "semantic",
    value: { dimension: 8, unit: "px" }, usage: "Buttons, alerts.", group: "Radius", meta },
  { id: "t.radius.lg", name: "radius.lg", type: "dimension", tier: "semantic",
    value: { dimension: 12, unit: "px" }, usage: "Cards, dialogs.", group: "Radius", meta },

  // spacing
  { id: "t.spacing.1", name: "spacing.1", type: "dimension", tier: "semantic",
    value: { dimension: 4, unit: "px" }, group: "Spacing", meta },
  { id: "t.spacing.2", name: "spacing.2", type: "dimension", tier: "semantic",
    value: { dimension: 8, unit: "px" }, group: "Spacing", meta },
  { id: "t.spacing.3", name: "spacing.3", type: "dimension", tier: "semantic",
    value: { dimension: 12, unit: "px" }, group: "Spacing", meta },
  { id: "t.spacing.4", name: "spacing.4", type: "dimension", tier: "semantic",
    value: { dimension: 16, unit: "px" }, group: "Spacing", meta },
  { id: "t.spacing.6", name: "spacing.6", type: "dimension", tier: "semantic",
    value: { dimension: 24, unit: "px" }, group: "Spacing", meta },

  // typography — font families (primitive: hold the actual stacks)
  { id: "t.font.heading", name: "font.heading", type: "fontFamily", tier: "primitive",
    value: { fontFamily: '"Inter Tight", "Inter", system-ui, sans-serif' },
    usage: "Display and heading text.", group: "Font Families", meta },
  { id: "t.font.body", name: "font.body", type: "fontFamily", tier: "primitive",
    value: { fontFamily: '"Inter", system-ui, sans-serif' },
    usage: "Body copy, labels, and UI text.", group: "Font Families", meta },
  { id: "t.font.mono", name: "font.mono", type: "fontFamily", tier: "primitive",
    value: { fontFamily: '"JetBrains Mono", ui-monospace, monospace' },
    usage: "Code and tabular figures.", group: "Font Families", meta },

  // typography — base styles (primitive: shared defaults semantic styles inherit)
  { id: "t.type.heading.base", name: "typography.heading.base", type: "typography", tier: "primitive",
    value: { typography: { fontFamily: { $ref: "t.font.heading" }, fontWeight: 700,
      lineHeight: 1.15, letterSpacing: { dimension: -0.02, unit: "em" } } },
    usage: "Shared defaults for display and heading styles.", group: "Base Styles", meta },
  { id: "t.type.body.base", name: "typography.body.base", type: "typography", tier: "primitive",
    value: { typography: { fontFamily: { $ref: "t.font.body" }, fontWeight: 400,
      lineHeight: 1.5 } },
    usage: "Shared defaults for body and caption styles.", group: "Base Styles", meta },
  { id: "t.type.label.base", name: "typography.label.base", type: "typography", tier: "primitive",
    value: { typography: { fontFamily: { $ref: "t.font.body" }, fontWeight: 500,
      lineHeight: 1.4 } },
    usage: "Shared defaults for labels and eyebrows.", group: "Base Styles", meta },
  { id: "t.type.link.base", name: "typography.link.base", type: "typography", tier: "primitive",
    value: { typography: { fontFamily: { $ref: "t.font.body" }, fontWeight: 500,
      lineHeight: 1.5 } },
    usage: "Shared defaults for link styles.", group: "Base Styles", meta },

  // typography — semantic text styles (inherit a base, override what differs)
  { id: "t.type.display.xl", name: "typography.display.xl", type: "typography", tier: "semantic",
    value: { typography: { extends: { $ref: "t.type.heading.base" },
      fontSize: { dimension: 3.75, unit: "rem" }, lineHeight: 1.05,
      letterSpacing: { dimension: -0.025, unit: "em" } } },
    usage: "Hero/marketing display text.", group: "Display", meta },
  { id: "t.type.display.lg", name: "typography.display.lg", type: "typography", tier: "semantic",
    value: { typography: { extends: { $ref: "t.type.heading.base" },
      fontSize: { dimension: 3, unit: "rem" }, lineHeight: 1.1 } },
    usage: "Large display text.", group: "Display", meta },
  { id: "t.type.heading.xl", name: "typography.heading.xl", type: "typography", tier: "semantic",
    value: { typography: { extends: { $ref: "t.type.heading.base" },
      fontSize: { dimension: 2.25, unit: "rem" } } },
    usage: "Top-level page titles.", group: "Headings", meta },
  { id: "t.type.heading.lg", name: "typography.heading.lg", type: "typography", tier: "semantic",
    value: { typography: { extends: { $ref: "t.type.heading.base" },
      fontSize: { dimension: 2, unit: "rem" } } },
    usage: "Page and section headings.", group: "Headings", meta },
  { id: "t.type.heading.md", name: "typography.heading.md", type: "typography", tier: "semantic",
    value: { typography: { extends: { $ref: "t.type.heading.base" },
      fontSize: { dimension: 1.5, unit: "rem" }, lineHeight: 1.25 } },
    usage: "Subsection headings.", group: "Headings", meta },
  { id: "t.type.heading.sm", name: "typography.heading.sm", type: "typography", tier: "semantic",
    value: { typography: { extends: { $ref: "t.type.heading.base" },
      fontSize: { dimension: 1.25, unit: "rem" }, lineHeight: 1.3, fontWeight: 600 } },
    usage: "Card titles and minor headings.", group: "Headings", meta },
  { id: "t.type.body.lg", name: "typography.body.lg", type: "typography", tier: "semantic",
    value: { typography: { extends: { $ref: "t.type.body.base" },
      fontSize: { dimension: 1.125, unit: "rem" } } },
    usage: "Lead paragraphs.", group: "Body", meta },
  { id: "t.type.body.md", name: "typography.body.md", type: "typography", tier: "semantic",
    value: { typography: { extends: { $ref: "t.type.body.base" },
      fontSize: { dimension: 1, unit: "rem" } } },
    usage: "Default body copy.", group: "Body", meta },
  { id: "t.type.body.sm", name: "typography.body.sm", type: "typography", tier: "semantic",
    value: { typography: { extends: { $ref: "t.type.body.base" },
      fontSize: { dimension: 0.875, unit: "rem" } } },
    usage: "Dense/secondary body copy.", group: "Body", meta },
  { id: "t.type.label.lg", name: "typography.label.lg", type: "typography", tier: "semantic",
    value: { typography: { extends: { $ref: "t.type.label.base" },
      fontSize: { dimension: 1, unit: "rem" } } },
    usage: "Large buttons and prominent labels.", group: "Labels", meta },
  { id: "t.type.label.md", name: "typography.label.md", type: "typography", tier: "semantic",
    value: { typography: { extends: { $ref: "t.type.label.base" },
      fontSize: { dimension: 0.875, unit: "rem" } } },
    usage: "Buttons and form labels.", group: "Labels", meta },
  { id: "t.type.label.sm", name: "typography.label.sm", type: "typography", tier: "semantic",
    value: { typography: { extends: { $ref: "t.type.label.base" },
      fontSize: { dimension: 0.75, unit: "rem" } } },
    usage: "Compact labels and badges.", group: "Labels", meta },
  { id: "t.type.link.md", name: "typography.link.md", type: "typography", tier: "semantic",
    value: { typography: { extends: { $ref: "t.type.link.base" },
      fontSize: { dimension: 1, unit: "rem" } } },
    usage: "Inline links in body copy.", group: "Links", meta },
  { id: "t.type.link.sm", name: "typography.link.sm", type: "typography", tier: "semantic",
    value: { typography: { extends: { $ref: "t.type.link.base" },
      fontSize: { dimension: 0.875, unit: "rem" } } },
    usage: "Small/secondary links.", group: "Links", meta },
  { id: "t.type.caption", name: "typography.caption", type: "typography", tier: "semantic",
    value: { typography: { extends: { $ref: "t.type.body.base" },
      fontSize: { dimension: 0.75, unit: "rem" }, lineHeight: 1.35 } },
    usage: "Helper text and image captions.", group: "Caption & Eyebrow", meta },
  { id: "t.type.eyebrow", name: "typography.eyebrow", type: "typography", tier: "semantic",
    value: { typography: { extends: { $ref: "t.type.label.base" },
      fontSize: { dimension: 0.75, unit: "rem" }, fontWeight: 600,
      letterSpacing: { dimension: 0.08, unit: "em" }, textTransform: "uppercase" } },
    usage: "Small uppercase kicker above headings.", group: "Caption & Eyebrow", meta },

  // shadow / elevation
  { id: "t.shadow.sm", name: "shadow.sm", type: "shadow", tier: "semantic",
    value: { shadow: [{ x: { dimension: 0, unit: "px" }, y: { dimension: 1, unit: "px" },
      blur: { dimension: 2, unit: "px" }, spread: { dimension: 0, unit: "px" },
      color: { color: "rgba(24,26,29,0.08)" } }] }, group: "Elevation", meta },
  { id: "t.shadow.md", name: "shadow.md", type: "shadow", tier: "semantic",
    value: { shadow: [{ x: { dimension: 0, unit: "px" }, y: { dimension: 6, unit: "px" },
      blur: { dimension: 16, unit: "px" }, spread: { dimension: -4, unit: "px" },
      color: { color: "rgba(24,26,29,0.16)" } }] }, group: "Elevation", meta },

  // motion
  { id: "t.duration.fast", name: "duration.fast", type: "duration", tier: "semantic",
    value: { duration: 150, unit: "ms" }, usage: "Hover/press micro-interactions.",
    group: "Motion", meta },
  { id: "t.easing.standard", name: "easing.standard", type: "easing", tier: "semantic",
    value: { easing: [0.2, 0, 0, 1] }, usage: "Default easing for UI transitions.",
    group: "Motion", meta },
];

// --- components ------------------------------------------------------------

const components: Component[] = [
  {
    id: "c.button", name: "Button", status: "published",
    intent: "Trigger a single, clear action.",
    variants: [
      { id: "c.button.v.primary", name: "primary", props: { variant: "primary" } },
      { id: "c.button.v.secondary", name: "secondary", props: { variant: "secondary" } },
      { id: "c.button.v.ghost", name: "ghost", props: { variant: "ghost" } },
    ],
    states: [
      { id: "c.button.s.default", name: "default" },
      { id: "c.button.s.hover", name: "hover" },
      { id: "c.button.s.focus", name: "focus" },
      { id: "c.button.s.disabled", name: "disabled" },
      { id: "c.button.s.loading", name: "loading" },
    ],
    bindings: [
      // --- base recipe (shared by every variant) ---
      { id: "c.button.b1", property: "background", tokenId: "t.color.primary" },
      { id: "c.button.b3", property: "color", tokenId: "t.color.textOnPrimary" },
      { id: "c.button.b4", property: "radius", tokenId: "t.radius.md" },
      { id: "c.button.b5", property: "paddingX", tokenId: "t.spacing.3" },
      { id: "c.button.b6", property: "paddingY", tokenId: "t.spacing.2" },
      { id: "c.button.b7", property: "font", tokenId: "t.type.label.md" },
      { id: "c.button.b8", property: "gap", tokenId: "t.spacing.1" },
      // --- state override: hover (applies across variants) ---
      { id: "c.button.b2", property: "background", tokenId: "t.color.primaryHover",
        appliesTo: { state: "hover" } },
      // --- variant override: secondary (neutral surface, bordered) ---
      { id: "c.button.b9", property: "background", tokenId: "t.color.surface",
        appliesTo: { variant: "secondary" } },
      { id: "c.button.b10", property: "color", tokenId: "t.color.text",
        appliesTo: { variant: "secondary" } },
      { id: "c.button.b11", property: "borderColor", tokenId: "t.color.border",
        appliesTo: { variant: "secondary" } },
      // --- variant override: ghost (transparent, primary text) ---
      { id: "c.button.b12", property: "background", tokenId: "t.color.transparent",
        appliesTo: { variant: "ghost" } },
      { id: "c.button.b13", property: "color", tokenId: "t.color.primary",
        appliesTo: { variant: "ghost" } },
    ],
    accessibility: {
      contrast: [
        { id: "c.button.ct1", foregroundTokenId: "t.color.textOnPrimary",
          backgroundTokenId: "t.color.primary", level: "AA", role: "text" },
      ],
      keyboard: ["Enter/Space activate"],
      focus: { visible: true },
      minTargetSize: { width: 44, height: 44, unit: "px" },
    },
    aiRules: {
      do: ["Use for the single primary action on a screen."],
      avoid: ["Don't use for navigation — use a Link.", "Don't place two primary Buttons side by side."],
      linkedTokens: ["t.color.primary", "t.radius.md"],
    },
    code: { framework: "react", authored: '<Button variant="primary">Save</Button>' },
    examples: [{ id: "c.button.e1", name: "Primary", variant: "primary", props: { children: "Save" } }],
    meta,
  },
  {
    id: "c.card", name: "Card", status: "published",
    intent: "Group related content on a surface.",
    variants: [{ id: "c.card.v.default", name: "default", props: {} }],
    states: [{ id: "c.card.s.default", name: "default" }],
    bindings: [
      { id: "c.card.b1", property: "background", tokenId: "t.color.surface" },
      { id: "c.card.b2", property: "radius", tokenId: "t.radius.lg" },
      { id: "c.card.b3", property: "padding", tokenId: "t.spacing.4" },
      { id: "c.card.b4", property: "shadow", tokenId: "t.shadow.sm" },
      { id: "c.card.b5", property: "titleTypography", tokenId: "t.type.heading.sm" },
      { id: "c.card.b6", property: "bodyTypography", tokenId: "t.type.body.md" },
    ],
    accessibility: {
      contrast: [
        { id: "c.card.ct1", foregroundTokenId: "t.color.text",
          backgroundTokenId: "t.color.surface", level: "AA", role: "text" },
      ],
    },
    aiRules: {
      do: ["Use to group related content into a scannable unit."],
      avoid: ["Don't nest cards more than one level deep."],
      linkedTokens: ["t.color.surface", "t.radius.lg"],
    },
    code: { framework: "react", authored: "<Card>…</Card>" },
    examples: [{ id: "c.card.e1", name: "Default", props: {} }],
    meta,
  },
  {
    id: "c.input", name: "Input", status: "published",
    intent: "Collect a single line of text from the user.",
    variants: [
      { id: "c.input.v.default", name: "default", props: {} },
      { id: "c.input.v.error", name: "error", props: { invalid: true } },
    ],
    states: [
      { id: "c.input.s.default", name: "default" },
      { id: "c.input.s.focus", name: "focus" },
      { id: "c.input.s.disabled", name: "disabled" },
    ],
    bindings: [
      { id: "c.input.b1", property: "background", tokenId: "t.color.surface" },
      { id: "c.input.b2", property: "color", tokenId: "t.color.text" },
      { id: "c.input.b3", property: "borderColor", tokenId: "t.color.border" },
      { id: "c.input.b4", property: "radius", tokenId: "t.radius.sm" },
      { id: "c.input.b5", property: "paddingX", tokenId: "t.spacing.3" },
      { id: "c.input.b6", property: "paddingY", tokenId: "t.spacing.2" },
      { id: "c.input.b7", property: "font", tokenId: "t.type.body.md" },
    ],
    accessibility: {
      contrast: [
        { id: "c.input.ct1", foregroundTokenId: "t.color.text",
          backgroundTokenId: "t.color.surface", level: "AA", role: "text" },
        { id: "c.input.ct2", foregroundTokenId: "t.color.border",
          backgroundTokenId: "t.color.surface", level: "AA", role: "ui" },
      ],
      keyboard: ["Tab to focus", "Type to edit"],
      focus: { visible: true },
      aria: { role: "textbox" },
    },
    aiRules: {
      do: ["Always pair with a visible label."],
      avoid: ["Don't use placeholder text as the only label."],
      linkedTokens: ["t.color.border"],
    },
    code: { framework: "react", authored: '<Input aria-label="Email" />' },
    examples: [{ id: "c.input.e1", name: "Default", props: { placeholder: "you@example.com" } }],
    meta,
  },
  {
    id: "c.badge", name: "Badge", status: "published",
    intent: "Label or annotate with a small status token.",
    variants: [
      { id: "c.badge.v.default", name: "default", props: {} },
      { id: "c.badge.v.danger", name: "danger", props: { tone: "danger" } },
    ],
    states: [{ id: "c.badge.s.default", name: "default" }],
    bindings: [
      { id: "c.badge.b1", property: "background", tokenId: "t.color.primary" },
      { id: "c.badge.b2", property: "color", tokenId: "t.color.textOnPrimary" },
      { id: "c.badge.b3", property: "radius", tokenId: "t.radius.sm" },
      { id: "c.badge.b4", property: "paddingX", tokenId: "t.spacing.2" },
    ],
    accessibility: {
      contrast: [
        { id: "c.badge.ct1", foregroundTokenId: "t.color.textOnPrimary",
          backgroundTokenId: "t.color.primary", level: "AA", role: "text" },
      ],
    },
    aiRules: {
      do: ["Use for short status labels (1-2 words)."],
      avoid: ["Don't use Badge as a button — it is not interactive."],
      linkedTokens: ["t.color.primary"],
    },
    code: { framework: "react", authored: "<Badge>New</Badge>" },
    examples: [{ id: "c.badge.e1", name: "New", props: { children: "New" } }],
    meta,
  },
  {
    id: "c.alert", name: "Alert", status: "published",
    intent: "Communicate an important, contextual message.",
    variants: [
      { id: "c.alert.v.info", name: "info", props: { tone: "info" } },
      { id: "c.alert.v.danger", name: "danger", props: { tone: "danger" } },
    ],
    states: [{ id: "c.alert.s.default", name: "default" }],
    bindings: [
      { id: "c.alert.b1", property: "background", tokenId: "t.color.surface" },
      { id: "c.alert.b2", property: "color", tokenId: "t.color.text" },
      { id: "c.alert.b3", property: "borderColor", tokenId: "t.color.border" },
      { id: "c.alert.b4", property: "radius", tokenId: "t.radius.md" },
      { id: "c.alert.b5", property: "padding", tokenId: "t.spacing.3" },
    ],
    accessibility: {
      contrast: [
        { id: "c.alert.ct1", foregroundTokenId: "t.color.text",
          backgroundTokenId: "t.color.surface", level: "AA", role: "text" },
      ],
      aria: { role: "alert" },
    },
    aiRules: {
      do: ["Use for contextual, in-page messages tied to a task."],
      avoid: ["Don't use for transient notifications — use a Toast (later)."],
      linkedTokens: ["t.color.danger"],
    },
    code: { framework: "react", authored: '<Alert tone="danger">Something went wrong</Alert>' },
    examples: [{ id: "c.alert.e1", name: "Danger", variant: "danger", props: { children: "Payment failed" } }],
    meta,
  },
  {
    id: "c.dialog", name: "Dialog", status: "published",
    intent: "Interrupt the flow for a focused, modal task.",
    variants: [{ id: "c.dialog.v.default", name: "default", props: {} }],
    states: [
      { id: "c.dialog.s.open", name: "open" },
      { id: "c.dialog.s.closed", name: "closed" },
    ],
    slots: [
      { id: "c.dialog.slot.title", name: "title", required: true },
      { id: "c.dialog.slot.body", name: "body", required: true },
      { id: "c.dialog.slot.actions", name: "actions", required: false },
    ],
    bindings: [
      { id: "c.dialog.b1", property: "background", tokenId: "t.color.surface" },
      { id: "c.dialog.b2", property: "radius", tokenId: "t.radius.lg" },
      { id: "c.dialog.b3", property: "padding", tokenId: "t.spacing.6" },
      { id: "c.dialog.b4", property: "shadow", tokenId: "t.shadow.md" },
    ],
    accessibility: {
      contrast: [
        { id: "c.dialog.ct1", foregroundTokenId: "t.color.text",
          backgroundTokenId: "t.color.surface", level: "AA", role: "text" },
      ],
      keyboard: ["Esc closes", "Focus is trapped", "Focus returns to trigger on close"],
      focus: { visible: true },
      aria: { role: "dialog", attributes: { "aria-modal": "true" } },
    },
    aiRules: {
      do: ["Use for a focused decision or task that blocks the underlying page."],
      avoid: ["Don't stack multiple Dialogs.", "Don't use for non-blocking info."],
      linkedTokens: ["t.color.surface", "t.shadow.md"],
    },
    code: { framework: "react", authored: "<Dialog open>…</Dialog>" },
    examples: [{ id: "c.dialog.e1", name: "Confirm", props: { open: true } }],
    meta,
  },
];

// --- patterns --------------------------------------------------------------

const patterns: Pattern[] = [
  {
    id: "p.authForm", name: "Auth form",
    intent: "Let a returning user sign in.",
    usage: "Use on dedicated sign-in pages, centered on the screen.",
    composition: [
      { id: "p.authForm.root", layout: { direction: "col", gap: "t.spacing.4" },
        children: [
          { id: "p.authForm.email", componentId: "c.input" },
          { id: "p.authForm.password", componentId: "c.input" },
          { id: "p.authForm.submit", componentId: "c.button" },
        ] },
    ],
    aiRules: {
      do: ["Use one primary Button (Sign in) and label every Input."],
      avoid: ["Don't add more than the fields needed to authenticate."],
      linkedComponents: ["c.input", "c.button"],
    },
    meta,
  },
  {
    id: "p.pricingCard", name: "Pricing card",
    intent: "Present a single plan and its call to action.",
    usage: "Use in a row of comparable plans.",
    composition: [
      { id: "p.pricingCard.root", componentId: "c.card",
        layout: { direction: "col", gap: "t.spacing.3" },
        children: [
          { id: "p.pricingCard.badge", componentId: "c.badge" },
          { id: "p.pricingCard.cta", componentId: "c.button" },
        ] },
    ],
    aiRules: {
      do: ["Highlight at most one recommended plan with the primary Button."],
      avoid: ["Don't overload the card with more than ~5 feature lines."],
      linkedComponents: ["c.card", "c.button", "c.badge"],
    },
    meta,
  },
  {
    id: "p.settingsSection", name: "Settings section",
    intent: "Group a set of related settings with a save action.",
    usage: "Use within a settings page, one section per concern.",
    composition: [
      { id: "p.settingsSection.root", componentId: "c.card",
        layout: { direction: "col", gap: "t.spacing.4" },
        children: [
          { id: "p.settingsSection.field", componentId: "c.input" },
          { id: "p.settingsSection.save", componentId: "c.button" },
        ] },
    ],
    aiRules: {
      do: ["Group related fields and provide a single save action per section."],
      avoid: ["Don't auto-save destructive changes without confirmation."],
      linkedComponents: ["c.card", "c.input", "c.button"],
    },
    meta,
  },
  {
    id: "p.emptyState", name: "Empty state",
    intent: "Explain why a view is empty and offer the next action.",
    usage: "Use when a list/collection has no items yet.",
    composition: [
      { id: "p.emptyState.root", layout: { direction: "col", gap: "t.spacing.3" },
        children: [{ id: "p.emptyState.cta", componentId: "c.button" }] },
    ],
    aiRules: {
      do: ["Explain the empty state and give one clear primary action."],
      avoid: ["Don't show an empty state that looks like an error."],
      linkedComponents: ["c.button"],
    },
    meta,
  },
];

// --- docs ------------------------------------------------------------------

const docs: DocNode[] = [
  {
    id: "d.overview", title: "Overview",
    target: { kind: "system" },
    body: "# Acme UI\n\nA seed design system demonstrating tokens, components, and patterns.",
    meta,
  },
];

export const seedDesignSystem: DesignSystem = {
  id: "ds.seed",
  name: "Acme UI",
  schemaVersion: SCHEMA_VERSION,
  meta: { description: "Seed/example design system for Yahoda.", createdAt: NOW, updatedAt: NOW },
  tokens,
  components,
  patterns,
  docs,
  published: null,
  draft: { changes: [] },
  history: [],
};

/**
 * Deep clone so tests/callers can mutate freely without touching the canonical seed.
 * Uses JSON clone (the seed is fully JSON-serializable) to keep core dependency-free.
 */
export function createSeedDesignSystem(): DesignSystem {
  return JSON.parse(JSON.stringify(seedDesignSystem)) as DesignSystem;
}
