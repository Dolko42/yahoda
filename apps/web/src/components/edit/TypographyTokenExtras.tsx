"use client";

import { type ReactNode, useMemo } from "react";
import {
  type DesignSystem,
  type Token,
  type TokenValue,
  type TypographyFieldName,
  getFontFamilyUsages,
  getTypographyChildren,
  getTypographyParent,
  isFontFamilyToken,
  isTypographyBaseToken,
  isTypographySemanticToken,
  isRefValue,
  resolveTypographyToken,
} from "@yahoda/core";
import { useWorkspace } from "@/store/workspace";
import { NumberField, SelectField, TextField } from "./Controls";

type TypographyFields = Extract<TokenValue, { typography: unknown }>["typography"];

/**
 * Typography inspector controls. Font tokens edit their stack and show every style that
 * resolves through them. Style tokens get the parent binder plus per-field editors with
 * provenance: an inherited field shows where its value comes from, an overridden field
 * can be reset back to inherited (the own field is simply removed from the value —
 * resolution falls back to the chain).
 */

export function TypographyTokenExtras({ ds, token }: { ds: DesignSystem; token: Token }) {
  if (isFontFamilyToken(token)) return <FontFamilyEditor ds={ds} token={token} />;
  if (token.type === "typography") return <StyleEditor ds={ds} token={token} />;
  return null;
}

// --- font family ---------------------------------------------------------------

function FontFamilyEditor({ ds, token }: { ds: DesignSystem; token: Token }) {
  const patchToken = useWorkspace((s) => s.patchToken);
  const select = useWorkspace((s) => s.select);
  const stack = "fontFamily" in token.value ? token.value.fontFamily : "";
  const usages = useMemo(() => getFontFamilyUsages(ds, token.id), [ds, token.id]);

  return (
    <>
      <div className="border-b border-line/60 py-2.5">
        <div className="mb-1 text-[11px] uppercase tracking-wide text-faint">Font stack</div>
        <TextField
          value={stack}
          mono
          placeholder='"Inter", system-ui, sans-serif'
          onCommit={(v) => v.trim() && patchToken(token.id, { value: { fontFamily: v.trim() } })}
        />
        <div className="mt-1 text-[11px] text-faint">
          Include fallbacks — every style using this font updates immediately.
        </div>
      </div>
      <div className="border-b border-line/60 py-2.5">
        <div className="text-[11px] uppercase tracking-wide text-faint">
          Used by {usages.length} style{usages.length === 1 ? "" : "s"}
        </div>
        {usages.length === 0 ? (
          <div className="mt-1 text-[12px] text-faint">No typography styles use this font yet.</div>
        ) : (
          <ul className="mt-1 space-y-0.5">
            {usages.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => select({ kind: "token", id: t.id })}
                  className="w-full rounded-md px-1.5 py-1 text-left font-mono text-[12px] text-strong hover:bg-page"
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

// --- text style ------------------------------------------------------------------

const WEIGHT_OPTIONS = ["100", "200", "300", "400", "500", "600", "700", "800", "900"] as const;
const TRANSFORM_OPTIONS = ["none", "uppercase", "lowercase", "capitalize"] as const;
const FONT_STYLE_OPTIONS = ["normal", "italic"] as const;
const SIZE_UNITS = ["rem", "px", "em"] as const;
const SPACING_UNITS = ["em", "px", "rem"] as const;

function StyleEditor({ ds, token }: { ds: DesignSystem; token: Token }) {
  const patchToken = useWorkspace((s) => s.patchToken);
  const own: TypographyFields = "typography" in token.value ? token.value.typography : {};
  const resolved = resolveTypographyToken(ds, token.id);
  const isSemantic = isTypographySemanticToken(token);
  const parent = getTypographyParent(ds, token.id);
  const children = useMemo(() => getTypographyChildren(ds, token.id), [ds, token.id]);

  const bases = useMemo(
    () =>
      ds.tokens
        .filter((t) => isTypographyBaseToken(t) && t.id !== token.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [ds.tokens, token.id],
  );
  const fonts = useMemo(
    () => ds.tokens.filter(isFontFamilyToken).sort((a, b) => a.name.localeCompare(b.name)),
    [ds.tokens],
  );

  const patchFields = (patch: Partial<TypographyFields>) =>
    patchToken(token.id, { value: { typography: { ...own, ...patch } } });

  const clearField = (key: keyof TypographyFields) => {
    const next = { ...own };
    delete next[key];
    patchToken(token.id, { value: { typography: next } });
  };

  /** provenance line + reset control for one field */
  const Provenance = ({ field }: { field: TypographyFieldName }) => {
    const src = resolved.sources[field];
    if (src.source === "own") {
      const fallsBackTo =
        parent || src.tokenId !== token.id ? "inherited" : "default";
      return (
        <button
          onClick={() => clearField(field as keyof TypographyFields)}
          title={`Remove this override — falls back to the ${fallsBackTo} value`}
          className="text-[10px] text-primary hover:underline"
        >
          Reset
        </button>
      );
    }
    if (src.source === "inherited") {
      const from = ds.tokens.find((t) => t.id === src.tokenId);
      return (
        <span className="truncate text-[10px] text-faint" title={`Inherited from ${from?.name}`}>
          from <span className="font-mono">{from?.name.replace(/^typography\./, "") ?? "?"}</span>
        </span>
      );
    }
    return <span className="text-[10px] text-faint">default</span>;
  };

  const Row = ({
    label,
    field,
    children,
  }: {
    label: string;
    field: TypographyFieldName;
    children: ReactNode;
  }) => (
    <div className="border-b border-line/60 py-2.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wide text-faint">{label}</span>
        <Provenance field={field} />
      </div>
      {children}
    </div>
  );

  // --- current field readings (resolved, so inherited values show through) ------
  const ownSize = own.fontSize && !isRefValue(own.fontSize) ? own.fontSize : null;
  const sizeMatch = /^([\d.]+)([a-z%]+)$/.exec(resolved.style.fontSize);
  const sizeValue = ownSize?.dimension ?? Number(sizeMatch?.[1] ?? 1);
  const sizeUnit = (ownSize?.unit ?? sizeMatch?.[2] ?? "rem") as (typeof SIZE_UNITS)[number];
  const spacingValue =
    own.letterSpacing?.dimension ??
    (resolved.style.letterSpacing === "normal" ? 0 : parseFloat(resolved.style.letterSpacing));
  const spacingUnit = (own.letterSpacing?.unit ??
    (resolved.style.letterSpacing.match(/[a-z%]+$/)?.[0] || "em")) as (typeof SPACING_UNITS)[number];
  const currentFontRefId =
    own.fontFamily && isRefValue(own.fontFamily) ? own.fontFamily.$ref : "";

  return (
    <>
      {isSemantic && (
        <div className="border-b border-line/60 py-2.5">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-faint">Inherits from</div>
          <select
            value={parent?.id ?? ""}
            onChange={(e) =>
              e.target.value
                ? patchFields({ extends: { $ref: e.target.value } })
                : clearField("extends")
            }
            className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-[13px] text-strong outline-none focus:border-primary"
          >
            <option value="">No base style</option>
            {bases.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <div className="mt-1 text-[11px] text-faint">
            {parent
              ? "Unset fields inherit from this base — overrides below win."
              : "Standalone style — every field is its own."}
          </div>
        </div>
      )}

      <Row label="Font family" field="fontFamily">
        <select
          value={currentFontRefId}
          onChange={(e) =>
            e.target.value
              ? patchFields({ fontFamily: { $ref: e.target.value } })
              : clearField("fontFamily")
          }
          className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-[13px] text-strong outline-none focus:border-primary"
        >
          <option value="">
            {resolved.sources.fontFamily.source === "own" && !currentFontRefId
              ? `Custom: ${resolved.style.fontFamily}`
              : `Inherited (${resolved.style.fontFamily.split(",")[0]?.replace(/"/g, "").trim()})`}
          </option>
          {fonts.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </Row>

      <Row label="Font size" field="fontSize">
        <div className="flex items-center gap-2">
          <NumberField
            value={sizeValue}
            step={sizeUnit === "px" ? 1 : 0.125}
            min={0}
            onCommit={(n) =>
              n > 0 && patchFields({ fontSize: { dimension: n, unit: sizeUnit } })
            }
          />
          <SelectField
            value={sizeUnit}
            options={SIZE_UNITS}
            onCommit={(u) => patchFields({ fontSize: { dimension: sizeValue, unit: u } })}
          />
        </div>
      </Row>

      <Row label="Font weight" field="fontWeight">
        <SelectField
          value={String(resolved.style.fontWeight) as (typeof WEIGHT_OPTIONS)[number]}
          options={WEIGHT_OPTIONS}
          onCommit={(w) => patchFields({ fontWeight: Number(w) })}
        />
      </Row>

      <Row label="Line height" field="lineHeight">
        <NumberField
          value={resolved.style.lineHeight}
          step={0.05}
          min={0}
          onCommit={(n) => n > 0 && patchFields({ lineHeight: n })}
        />
      </Row>

      <Row label="Letter spacing" field="letterSpacing">
        <div className="flex items-center gap-2">
          <NumberField
            value={Number.isFinite(spacingValue) ? spacingValue : 0}
            step={0.01}
            onCommit={(n) => patchFields({ letterSpacing: { dimension: n, unit: spacingUnit } })}
          />
          <SelectField
            value={SPACING_UNITS.includes(spacingUnit) ? spacingUnit : "em"}
            options={SPACING_UNITS}
            onCommit={(u) =>
              patchFields({
                letterSpacing: {
                  dimension: Number.isFinite(spacingValue) ? spacingValue : 0,
                  unit: u,
                },
              })
            }
          />
        </div>
      </Row>

      <Row label="Text transform" field="textTransform">
        <SelectField
          value={resolved.style.textTransform}
          options={TRANSFORM_OPTIONS}
          onCommit={(v) => patchFields({ textTransform: v })}
        />
      </Row>

      <Row label="Font style" field="fontStyle">
        <SelectField
          value={resolved.style.fontStyle}
          options={FONT_STYLE_OPTIONS}
          onCommit={(v) => patchFields({ fontStyle: v })}
        />
      </Row>

      {children.length > 0 && <ChildrenList childTokens={children} />}

      {!resolved.ok && resolved.issues.length > 0 && (
        <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-[12px] text-amber-800">
          {resolved.issues.join("; ")}
        </div>
      )}
    </>
  );
}

function ChildrenList({ childTokens }: { childTokens: Token[] }) {
  const select = useWorkspace((s) => s.select);
  return (
    <div className="border-b border-line/60 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-faint">
        Inherited by {childTokens.length} style{childTokens.length === 1 ? "" : "s"}
      </div>
      <ul className="mt-1 space-y-0.5">
        {childTokens.map((t) => (
          <li key={t.id}>
            <button
              onClick={() => select({ kind: "token", id: t.id })}
              className="w-full rounded-md px-1.5 py-1 text-left font-mono text-[12px] text-strong hover:bg-page"
            >
              {t.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
