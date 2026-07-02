# Data Model (the most important doc)

Everything renders from this. Tokens, components, patterns, docs, accessibility, AI
rules, and history are nodes/edges in one typed graph. Schemas are **Zod**; TS types are
inferred. This file is descriptive; the runtime contract lives in
`design-system-data-contract.md`.

## 0. Principles recap

- One source of truth. Reverse-deps and blast radius are **derived**, never stored.
- Token values may be **raw** or a **reference** to another token (aliasing) → enables
  primitive → semantic → component tiers.
- Component → token relationships are explicit **bindings**; that's how cascade works.

## 1. Root document

```ts
DesignSystem = {
  id: string
  name: string
  schemaVersion: string          // contract version, e.g. "1.0.0"
  meta: { description?: string; createdAt: ISO; updatedAt: ISO }

  tokens: Token[]
  components: Component[]
  patterns: Pattern[]
  docs: DocNode[]

  // version control
  published: Snapshot            // last published state (canonical)
  draft: DraftOverlay            // uncommitted changes on top of `published`
  history: Commit[]              // ordered, immutable
}
```

> In practice `tokens/components/...` are the *resolved current working set* =
> `published` with `draft` applied. The `published` snapshot is the immutable baseline.

## 2. Node identity & references

- Every node has a stable `id` (uuid) **and** a human `name` (dotted path for tokens,
  e.g. `color.primary`; PascalCase for components, e.g. `Button`).
- References between nodes always use `id`, never `name` (renames don't break edges).
- A token value reference is written `{ "$ref": "<tokenId>" }`.

## 3. Tokens

```ts
TokenType =
  | "color" | "dimension"        // dimension = spacing/radius/size (unit-bearing)
  | "fontFamily"                 // a font stack, e.g. `"Inter", system-ui, sans-serif`
  | "typography"                 // composite text style; may inherit via `extends`
  | "shadow" | "border"
  | "duration" | "easing"        // motion
  | "opacity" | "zIndex"

Token = {
  id: string
  name: string                   // dotted path, unique. e.g. "color.primary"
  type: TokenType
  tier: "primitive" | "semantic" | "component"   // for export & docs grouping
  value: TokenValue              // raw value OR { $ref: tokenId } (alias)
  description?: string
  usage?: string                 // human guidance: when to use this token
  group?: string                 // sidebar grouping, e.g. "Brand", "Surface"
  deprecated?: { reason: string; replacedBy?: string }
  meta: NodeMeta
}
```

### Token value shapes (`TokenValue`)
```ts
| { $ref: string }                                   // alias to another token
| { color: string }                                  // hex/oklch; type=color
| { dimension: number; unit: "px"|"rem"|"em"|"%" }   // type=dimension
| { fontFamily: string }                             // type=fontFamily (a font stack)
| { typography: {                                    // type=typography (composite)
      extends?: Ref                                  //   parent/base style to inherit
      fontFamily?: string | Ref                      //   raw stack OR ref to a fontFamily token
      fontSize?: Ref|Dim; lineHeight?: number; fontWeight?: number
      letterSpacing?: Dim
      textTransform?: "none"|"uppercase"|"lowercase"|"capitalize"
      fontStyle?: "normal"|"italic" } }              //   all fields optional (partial style)
| { x: Dim; y: Dim; blur: Dim; spread: Dim; color: Ref|Color; inset?: boolean }[] // shadow
| { duration: number; unit: "ms"|"s" }               // type=duration
| { easing: [number,number,number,number] | string } // type=easing
| { opacity: number }                                // 0..1
| { zIndex: number }
```

### Aliasing → tiers
```
palette.blue.600  (primitive, {color:"#2448B8"})
        ▲ $ref
color.primary     (semantic,  {$ref: palette.blue.600})
        ▲ binding
Button.bg         (component binding → color.primary)
```
- **primitive**: raw value, brand palette / scales.
- **semantic**: alias to a primitive, named by intent (`color.primary`, `color.text`).
- **component**: optional per-component token, usually aliasing a semantic one.

Resolution (`core/resolve`) follows `$ref` chains to a concrete value. Cycles are
detected and rejected at validation time.

### Typography inheritance (same tiers, adapted for text)
```
font.heading            (fontFamily primitive, {fontFamily:'"Inter Tight", …'})
        ▲ fontFamily $ref
typography.heading.base (typography primitive — shared defaults: weight/line-height/…)
        ▲ extends $ref
typography.heading.lg   (typography semantic — overrides fontSize)
        ▲ binding
Button.font             (component binding → a semantic text style)
```
Resolution (`core/typography`) merges the `extends` chain root-first — a locally set
field always wins — then resolves font/size refs and fills gaps with defaults. The
`extends`/`fontFamily`/`fontSize` refs live inside the value, so the dependency graph,
safe deletion, and validation cover them like any other reference.

### Multiple tokens per type
Required and natural: `radius.sm/md/lg`, `spacing.1..12`, `typography.heading.lg` etc.
A component binding points at a *specific* token, so Button can use `radius.md` while
Card uses `radius.lg`.

## 4. Components

```ts
Component = {
  id: string
  name: string                   // PascalCase, unique
  status: "draft" | "published" | "deprecated"
  description?: string
  intent?: string                // why this component exists

  variants: Variant[]            // e.g. variant "primary"|"secondary"|"ghost"
  states: State[]                // default|hover|active|focus|disabled|loading|error
  slots?: Slot[]                 // named content areas (e.g. icon, label)

  bindings: TokenBinding[]       // THE dependency edges (see below)

  accessibility: A11ySpec        // see accessibility-strategy.md
  aiRules: AIRules               // do / avoid / context (see ai-context-strategy.md)
  code: CodeSpec                 // generated + optional authored reference
  docs?: string                  // markdown notes; full doc may be generated
  examples: Example[]            // named prop combos for preview/specimens

  deprecated?: { reason: string; replacedBy?: string; since: ISO }
  meta: NodeMeta
}

Variant = { id; name; description?; props: Record<string, JSONValue> }
State   = { id; name; description?; styleDelta?: Record<string, TokenRef|Value> }
Slot    = { id; name; required: boolean; description? }

TokenBinding = {
  id: string
  property: string               // e.g. "background", "radius", "paddingX", "font"
  tokenId: string                // points at a Token
  appliesTo?: { variant?: string; state?: string }   // scoped overrides
}

Example = { id; name; variant?: string; props: Record<string, JSONValue> }
```

### Inheritance & overrides
- A component **inherits** global semantic tokens through bindings (e.g. `background →
  color.primary`).
- A **per-variant/state override** is a binding with `appliesTo` set (e.g. `background →
  color.primaryHover` when `state = hover`). Overrides never mutate the global token;
  they point at a different token.
- If a binding's `tokenId` is missing/unresolved, the component renders an explicit
  "unresolved token" state and surfaces a validation error (never silently falls back).

## 5. Patterns

```ts
Pattern = {
  id: string
  name: string
  description?: string
  intent?: string
  composition: PatternNode[]     // tree of component instances + layout
  usage?: string                 // when to use this pattern
  aiRules: AIRules
  docs?: string
  meta: NodeMeta
}

PatternNode = {
  id: string
  componentId?: string           // reference to a Component (instance)
  props?: Record<string, JSONValue>
  layout?: { direction?: "row"|"col"; gap?: TokenRef; align?: string }
  children?: PatternNode[]
}
```
Patterns reference components by id → editing a component updates every pattern preview.

## 6. Documentation nodes

```ts
DocNode = {
  id: string
  title: string
  target?: { kind: "token"|"component"|"pattern"|"system"; id?: string }
  body: string                   // markdown (authored where it's genuinely human)
  generatedSections?: string[]   // names of sections produced from the model
  meta: NodeMeta
}
```
Docs blend **generated** sections (props, tokens, a11y, examples — always fresh) with
**authored** prose (rationale). See `ai-context-strategy.md` for the anti-staleness
approach (same idea applies to docs).

## 7. Accessibility spec (summary; full in accessibility-strategy.md)

```ts
A11ySpec = {
  contrast: ContrastRule[]       // { foregroundTokenId, backgroundTokenId, level:"AA"|"AAA", role:"text"|"ui" }
  keyboard?: string[]            // expected interactions
  aria?: { role?: string; attributes?: Record<string,string>; notes?: string }
  focus?: { visible: boolean; notes?: string }
  minTargetSize?: { width: number; height: number; unit: "px" }
}
```
Contrast results are **computed** from the referenced tokens, not stored.

## 8. AI rules (summary; full in ai-context-strategy.md)

```ts
AIRules = {
  do: string[]                   // when/how to use
  avoid: string[]                // when NOT to use
  context?: string               // extra guidance
  linkedTokens?: string[]        // tokenIds this rule is about (anti-staleness)
  linkedComponents?: string[]
}
```

## 9. Metadata, versioning nodes

```ts
NodeMeta = { createdAt: ISO; updatedAt: ISO; createdBy?: string; updatedBy?: string }

Snapshot     = { tokens; components; patterns; docs; takenAt: ISO; commitId: string }
DraftOverlay = { changes: Change[] }          // patch set on top of `published`
Change       = { op: "add"|"update"|"remove"; kind: NodeKind; id: string;
                 before?: JSONValue; after?: JSONValue }
Commit       = { id; message: string; author?: string; createdAt: ISO;
                 changes: Change[]; affected: { tokens: string[];
                 components: string[]; patterns: string[] } }
```
See `versioning-strategy.md` for how overlay → commit → snapshot works.

## 10. Derived data (NEVER stored)

Computed by `core/graph` and `core/a11y` on demand / memoized:
- **reverse dependencies** (`usedBy`) — invert all bindings & `$ref`s & pattern refs.
- **blast radius** of a node — transitive closure of `usedBy`.
- **contrast results** — from contrast rules + resolved token colors.
- **broken references** — bindings/`$ref`s pointing at missing or deprecated nodes.

## 11. Worked example (abridged JSON)

```jsonc
{
  "tokens": [
    { "id": "t_blue600", "name": "palette.blue.600", "type": "color",
      "tier": "primitive", "value": { "color": "#2448B8" } },
    { "id": "t_primary", "name": "color.primary", "type": "color",
      "tier": "semantic", "value": { "$ref": "t_blue600" },
      "usage": "Primary actions and brand emphasis." },
    { "id": "t_radmd", "name": "radius.md", "type": "dimension",
      "tier": "semantic", "value": { "dimension": 8, "unit": "px" } }
  ],
  "components": [
    { "id": "c_button", "name": "Button", "status": "published",
      "intent": "Trigger a single, clear action.",
      "variants": [{ "id":"v_pri","name":"primary","props":{"variant":"primary"} }],
      "states": [{ "id":"s_hover","name":"hover" }],
      "bindings": [
        { "id":"b1","property":"background","tokenId":"t_primary" },
        { "id":"b2","property":"radius","tokenId":"t_radmd" }
      ],
      "accessibility": { "contrast": [
        { "foregroundTokenId":"t_textOnPrimary","backgroundTokenId":"t_primary",
          "level":"AA","role":"text" } ] },
      "aiRules": { "do":["Use for the primary action on a screen."],
                   "avoid":["Don't use more than one primary Button per view."],
                   "linkedTokens":["t_primary","t_radmd"] },
      "examples": [{ "id":"e1","name":"Primary","variant":"v_pri","props":{} }]
    }
  ]
}
```

In this example, changing `palette.blue.600` cascades through `color.primary` to
`Button.background`, and the contrast rule re-evaluates automatically.
