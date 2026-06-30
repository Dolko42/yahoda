import type {
  Component,
  DesignSystem,
  Pattern,
  PatternNodeShape,
  Token,
  TokenType,
} from "../schema/index.js";
import { isRefValue } from "../schema/index.js";

/**
 * Graph-level invariant validation (contract invariants 1-7). Schema shape is already
 * guaranteed by Zod; this checks cross-node relationships that Zod cannot express.
 * See docs/design-system-data-contract.md.
 */

export type IssueLevel = "error" | "warning";

export interface ValidationIssue {
  level: IssueLevel;
  code: string;
  message: string;
  nodeId?: string;
}

export interface ValidationReport {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  ok: boolean;
}

/**
 * Maps a binding property to the token type it must be fed by. This is the single
 * source of truth for property→token-type compatibility, consumed by validation, the
 * property catalog (`propertySpec`), and the token picker UI.
 */
export const PROPERTY_TOKEN_TYPE: Record<string, TokenType> = {
  background: "color",
  color: "color",
  textColor: "color",
  foreground: "color",
  borderColor: "color",
  focusBorderColor: "color",
  placeholderColor: "color",
  radius: "dimension",
  borderRadius: "dimension",
  padding: "dimension",
  paddingX: "dimension",
  paddingY: "dimension",
  gap: "dimension",
  width: "dimension",
  height: "dimension",
  minWidth: "dimension",
  minHeight: "dimension",
  font: "typography",
  typography: "typography",
  titleTypography: "typography",
  bodyTypography: "typography",
  shadow: "shadow",
  elevation: "shadow",
  border: "border",
  duration: "duration",
  transition: "duration",
  easing: "easing",
  opacity: "opacity",
  zIndex: "zIndex",
};

export function validateInvariants(ds: DesignSystem): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const err = (code: string, message: string, nodeId?: string) =>
    errors.push({ level: "error", code, message, ...(nodeId ? { nodeId } : {}) });
  const warn = (code: string, message: string, nodeId?: string) =>
    warnings.push({ level: "warning", code, message, ...(nodeId ? { nodeId } : {}) });

  const tokensById = new Map<string, Token>();
  const componentsById = new Map<string, Component>();
  const patternIds = new Set<string>();
  const docIds = new Set<string>();

  // --- invariant 1: unique ids (across kinds) + unique names (within kind) ----
  const allIds = new Set<string>();
  const dupId = (id: string, nodeId: string) => {
    if (allIds.has(id)) err("DUPLICATE_ID", `Duplicate node id "${id}"`, nodeId);
    allIds.add(id);
  };
  const uniqueName = (() => {
    const seen: Record<string, Set<string>> = {};
    return (kind: string, name: string, nodeId: string) => {
      (seen[kind] ??= new Set());
      if (seen[kind]!.has(name))
        err("DUPLICATE_NAME", `Duplicate ${kind} name "${name}"`, nodeId);
      seen[kind]!.add(name);
    };
  })();

  for (const t of ds.tokens) {
    dupId(t.id, t.id);
    uniqueName("token", t.name, t.id);
    tokensById.set(t.id, t);
  }
  for (const c of ds.components) {
    dupId(c.id, c.id);
    uniqueName("component", c.name, c.id);
    componentsById.set(c.id, c);
  }
  for (const p of ds.patterns) {
    dupId(p.id, p.id);
    uniqueName("pattern", p.name, p.id);
    patternIds.add(p.id);
  }
  for (const d of ds.docs) {
    dupId(d.id, d.id);
    uniqueName("doc", d.title, d.id);
    docIds.add(d.id);
  }

  const tokenExists = (id: string) => tokensById.has(id);
  const isDeprecatedToken = (id: string) => Boolean(tokensById.get(id)?.deprecated);
  const isDeprecatedComponent = (id: string) =>
    componentsById.get(id)?.status === "deprecated" ||
    Boolean(componentsById.get(id)?.deprecated);

  // --- invariants 2-4: token refs, alias cycles, type agreement ---------------
  for (const t of ds.tokens) {
    if (isRefValue(t.value)) {
      const targetId = t.value.$ref;
      const target = tokensById.get(targetId);
      if (!target) {
        err(
          "DANGLING_REF",
          `Token "${t.name}" aliases missing token "${targetId}"`,
          t.id,
        );
      } else if (target.type !== t.type) {
        err(
          "TYPE_MISMATCH",
          `Token "${t.name}" (${t.type}) aliases "${target.name}" (${target.type})`,
          t.id,
        );
      }
    }
    if (t.deprecated?.replacedBy && !tokenExists(t.deprecated.replacedBy)) {
      warn(
        "DANGLING_REPLACEMENT",
        `Token "${t.name}" replacedBy missing token "${t.deprecated.replacedBy}"`,
        t.id,
      );
    }
  }

  // alias cycle detection (invariant 3)
  for (const t of ds.tokens) {
    const seen = new Set<string>();
    let cur: Token | undefined = t;
    while (cur && isRefValue(cur.value)) {
      if (seen.has(cur.id)) {
        err("ALIAS_CYCLE", `Token "${t.name}" is part of an alias cycle`, t.id);
        break;
      }
      seen.add(cur.id);
      cur = tokensById.get(cur.value.$ref);
    }
  }

  /** Resolve a token's effective type by following alias chain (best-effort). */
  const resolvedType = (id: string): TokenType | undefined => {
    const seen = new Set<string>();
    let cur = tokensById.get(id);
    while (cur && isRefValue(cur.value)) {
      if (seen.has(cur.id)) return undefined; // cycle, reported elsewhere
      seen.add(cur.id);
      cur = tokensById.get(cur.value.$ref);
    }
    return cur?.type;
  };

  // --- invariants 5-7: components -------------------------------------------
  for (const c of ds.components) {
    for (const b of c.bindings) {
      if (!tokenExists(b.tokenId)) {
        err(
          "DANGLING_REF",
          `Component "${c.name}" binding "${b.property}" -> missing token "${b.tokenId}"`,
          c.id,
        );
        continue;
      }
      // invariant 5: binding property/token type agreement
      const expected = PROPERTY_TOKEN_TYPE[b.property];
      if (expected) {
        const actual = resolvedType(b.tokenId);
        if (actual && actual !== expected) {
          err(
            "BINDING_TYPE_MISMATCH",
            `Component "${c.name}" property "${b.property}" expects ${expected} token but got ${actual}`,
            c.id,
          );
        }
      }
      // invariant 6: deprecated reference -> warning
      if (isDeprecatedToken(b.tokenId)) {
        warn(
          "USES_DEPRECATED",
          `Component "${c.name}" binds deprecated token "${tokensById.get(b.tokenId)!.name}"`,
          c.id,
        );
      }
    }

    // invariant 7: contrast rules reference color tokens
    for (const rule of c.accessibility.contrast) {
      for (const ref of [rule.foregroundTokenId, rule.backgroundTokenId] as const) {
        if (!tokenExists(ref)) {
          err(
            "DANGLING_REF",
            `Component "${c.name}" contrast rule references missing token "${ref}"`,
            c.id,
          );
        } else if (resolvedType(ref) !== "color") {
          err(
            "CONTRAST_NOT_COLOR",
            `Component "${c.name}" contrast rule references non-color token "${tokensById.get(ref)!.name}"`,
            c.id,
          );
        }
      }
    }

    // AI rule link integrity (anti-staleness machinery)
    for (const id of c.aiRules.linkedTokens ?? []) {
      if (!tokenExists(id))
        err("DANGLING_AI_LINK", `Component "${c.name}" AI rule links missing token "${id}"`, c.id);
    }
    for (const id of c.aiRules.linkedComponents ?? []) {
      if (!componentsById.has(id))
        warn("DANGLING_AI_LINK", `Component "${c.name}" AI rule links missing component "${id}"`, c.id);
    }
  }

  // --- patterns --------------------------------------------------------------
  const walkPattern = (p: Pattern, node: PatternNodeShape) => {
    if (node.componentId) {
      if (!componentsById.has(node.componentId)) {
        err(
          "DANGLING_REF",
          `Pattern "${p.name}" references missing component "${node.componentId}"`,
          p.id,
        );
      } else if (isDeprecatedComponent(node.componentId)) {
        warn(
          "USES_DEPRECATED",
          `Pattern "${p.name}" uses deprecated component "${componentsById.get(node.componentId)!.name}"`,
          p.id,
        );
      }
    }
    if (node.layout?.gap && !tokenExists(node.layout.gap)) {
      err(
        "DANGLING_REF",
        `Pattern "${p.name}" layout gap references missing token "${node.layout.gap}"`,
        p.id,
      );
    }
    for (const child of node.children ?? []) walkPattern(p, child);
  };
  for (const p of ds.patterns) for (const node of p.composition) walkPattern(p, node);

  // --- docs ------------------------------------------------------------------
  for (const d of ds.docs) {
    const target = d.target;
    if (target?.id) {
      const exists =
        (target.kind === "token" && tokensById.has(target.id)) ||
        (target.kind === "component" && componentsById.has(target.id)) ||
        (target.kind === "pattern" && patternIds.has(target.id));
      if (!exists)
        err(
          "DANGLING_REF",
          `Doc "${d.title}" targets missing ${target.kind} "${target.id}"`,
          d.id,
        );
    }
  }

  return { errors, warnings, ok: errors.length === 0 };
}

export class PublishValidationError extends Error {
  constructor(public readonly report: ValidationReport) {
    super(
      `Design system has ${report.errors.length} validation error(s): ` +
        report.errors.map((e) => `[${e.code}] ${e.message}`).join("; "),
    );
    this.name = "PublishValidationError";
  }
}

/** Throws PublishValidationError if any hard errors are present. */
export function assertPublishable(ds: DesignSystem): void {
  const report = validateInvariants(ds);
  if (!report.ok) throw new PublishValidationError(report);
}
