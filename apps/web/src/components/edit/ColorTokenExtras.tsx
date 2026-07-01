"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  type DesignSystem,
  type Token,
  generateColorScale,
  getColorFamily,
  getColorStep,
  getPrimitiveSourceForSemantic,
  isPrimitiveColor,
  isSemanticColor,
  resolveColor,
} from "@yahoda/core";
import { useWorkspace } from "@/store/workspace";
import { makePrimitiveColor, primitiveColorName } from "@/lib/tokens";

/**
 * Color-specific inspector controls. Semantic colors get a "Source primitive" binder that
 * rewrites the token's own `$ref` (so the alias — and every consumer — updates); primitive
 * colors get family/shade readouts and a deterministic "Generate scale" action.
 */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-line/60 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-faint">{label}</div>
      <div className="mt-0.5 text-[13px] text-strong">{children}</div>
    </div>
  );
}

export function ColorTokenExtras({ ds, token }: { ds: DesignSystem; token: Token }) {
  if (isSemanticColor(token)) return <SemanticSource ds={ds} token={token} />;
  if (isPrimitiveColor(token)) return <PrimitiveScale ds={ds} token={token} />;
  return null;
}

function SemanticSource({ ds, token }: { ds: DesignSystem; token: Token }) {
  const patchToken = useWorkspace((s) => s.patchToken);
  const source = getPrimitiveSourceForSemantic(ds, token.id);
  const resolved = resolveColor(ds, token.id) ?? "—";

  const primitives = useMemo(
    () => ds.tokens.filter((t) => t.type === "color" && t.tier === "primitive").sort((a, b) => a.name.localeCompare(b.name)),
    [ds.tokens],
  );

  const onChange = (value: string) => {
    if (value) {
      patchToken(token.id, { value: { $ref: value } });
    } else {
      // "raw hex" — pin the token's own value to the currently resolved color
      patchToken(token.id, { value: { color: resolveColor(ds, token.id) ?? "#000000" } });
    }
  };

  return (
    <>
      <div className="border-b border-line/60 py-2.5">
        <div className="text-[11px] uppercase tracking-wide text-faint">Source primitive color</div>
        <select
          value={source?.id ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-[13px] text-strong outline-none focus:border-primary"
        >
          <option value="">Raw hex (no source)</option>
          {primitives.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="mt-1 text-[11px] text-faint">
          {source
            ? "Resolves through this primitive — changing the primitive updates this color and every consumer."
            : "No primitive source — this color stores a raw hex."}
        </div>
      </div>
      <Field label="Resolved value">
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-3.5 w-3.5 rounded-full border border-line"
            style={{ backgroundColor: resolved }}
          />
          <span className="font-mono text-[12px]">{resolved}</span>
        </span>
      </Field>
    </>
  );
}

function PrimitiveScale({ ds, token }: { ds: DesignSystem; token: Token }) {
  const createTokens = useWorkspace((s) => s.createTokens);
  const family = getColorFamily(token);
  const step = getColorStep(token);
  const hex = resolveColor(ds, token.id) ?? "#000000";
  const [confirming, setConfirming] = useState(false);

  const plan = useMemo(() => {
    if (!family) return null;
    const anchorStep = step ?? 500;
    const scale = generateColorScale(hex, anchorStep);
    const existingNames = new Set(ds.tokens.map((t) => t.name));
    const toCreate = scale.filter((s) => !existingNames.has(primitiveColorName(family, String(s.step))));
    const skipped = scale.length - toCreate.length;
    return { toCreate, skipped };
  }, [ds.tokens, family, step, hex]);

  if (!family) {
    return (
      <div className="border-b border-line/60 py-2.5 text-[12px] text-faint">
        Name this color <span className="font-mono">palette.&lt;family&gt;.&lt;shade&gt;</span> to
        enable scale generation.
      </div>
    );
  }

  const runGenerate = () => {
    if (!plan) return;
    const tokens = plan.toCreate.map((s) =>
      makePrimitiveColor({ family, step: String(s.step), hex: s.hex }),
    );
    if (tokens.length > 0) createTokens(tokens);
    setConfirming(false);
  };

  const newCount = plan?.toCreate.length ?? 0;

  return (
    <>
      <Field label="Family"><span className="capitalize">{family}</span></Field>
      <Field label="Shade"><span className="font-mono">{step ?? "—"}</span></Field>
      <div className="py-2.5">
        {confirming ? (
          <div className="rounded-lg border border-line bg-page p-3">
            <div className="text-[12px] text-strong">
              Generate the <span className="capitalize">{family}</span> scale (100–900) from this
              anchor?
            </div>
            <div className="mt-1 text-[11px] text-faint">
              {newCount > 0
                ? `${newCount} new shade${newCount === 1 ? "" : "s"} will be created.`
                : "No new shades — all steps already exist."}
              {plan && plan.skipped > 0 && ` ${plan.skipped} existing shade${plan.skipped === 1 ? "" : "s"} kept.`}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={runGenerate}
                disabled={newCount === 0}
                className="rounded-md bg-primary px-2.5 py-1 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-40"
              >
                Generate {newCount > 0 ? newCount : ""}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-md border border-line bg-white px-2.5 py-1 text-[12px] text-muted hover:text-strong"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-md border border-line bg-white px-2.5 py-1.5 text-[12px] font-medium text-primary hover:bg-page"
          >
            Generate scale
          </button>
        )}
      </div>
    </>
  );
}
