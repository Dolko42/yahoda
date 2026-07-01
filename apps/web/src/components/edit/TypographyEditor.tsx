"use client";

import { useMemo } from "react";
import {
  type DesignSystem,
  type DimensionValue,
  type FluidSpec,
  type Token,
  type TokenValue,
  fluidToCss,
  isFluidValue,
  isRefValue,
} from "@yahoda/core";
import { EditRow, NumberField } from "./Controls";

/**
 * Rich typography editing. A text style points at a font-family primitive and a font-size
 * (a scale token, a fixed dimension, or a fluid clamp). Font families and sizes live in
 * their own primitive tokens, so a style references them rather than duplicating values.
 */

const DIM_UNITS = ["px", "rem", "em", "%"] as const;
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

const fieldCls =
  "rounded-md border border-line bg-white px-2 py-1 text-[13px] text-strong outline-none focus:border-primary";

const px = (n: number): DimensionValue => ({ dimension: n, unit: "px" });
const rem = (n: number): DimensionValue => ({ dimension: n, unit: "rem" });

/** A sensible fluid spec seeded from a starting size. */
export function defaultFluid(from?: DimensionValue): FluidSpec {
  const min = from ?? rem(1);
  const max = { dimension: Number((min.dimension * 1.5).toFixed(4)), unit: min.unit };
  return { min, max, minViewport: px(320), maxViewport: px(1240) };
}

// --- fluid editor (shared with the fluid dimension-token branch) -----------

export function FluidEditor({ spec, onChange }: { spec: FluidSpec; onChange: (s: FluidSpec) => void }) {
  const dim = (
    label: string,
    d: DimensionValue,
    patch: (d: DimensionValue) => FluidSpec,
    step: number,
  ) => (
    <label className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-faint">{label}</span>
      <span className="flex items-center gap-1.5">
        <NumberField value={d.dimension} step={step} onCommit={(n) => onChange(patch({ ...d, dimension: n }))} />
        <select
          value={d.unit}
          onChange={(e) => onChange(patch({ ...d, unit: e.target.value as DimensionValue["unit"] }))}
          className={`${fieldCls} cursor-pointer`}
        >
          {DIM_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </span>
    </label>
  );

  return (
    <div className="space-y-1.5 rounded-md border border-line bg-page/60 p-2">
      {dim("Min size", spec.min, (min) => ({ ...spec, min }), 0.125)}
      {dim("Max size", spec.max, (max) => ({ ...spec, max }), 0.125)}
      {dim("Min viewport", spec.minViewport, (minViewport) => ({ ...spec, minViewport }), 10)}
      {dim("Max viewport", spec.maxViewport, (maxViewport) => ({ ...spec, maxViewport }), 10)}
      <div className="truncate pt-1 font-mono text-[10px] text-faint" title={fluidToCss(spec)}>
        {fluidToCss(spec)}
      </div>
    </div>
  );
}

// --- typography composite editor -------------------------------------------

export function TypographyEditor({
  ds,
  token,
  commit,
}: {
  ds: DesignSystem;
  token: Token;
  commit: (v: TokenValue) => void;
}) {
  const ty = "typography" in token.value ? token.value.typography : null;

  const families = useMemo(() => ds.tokens.filter((t) => t.type === "fontFamily"), [ds.tokens]);
  const sizes = useMemo(
    () => ds.tokens.filter((t) => t.type === "dimension" && t.name.startsWith("fontSize")),
    [ds.tokens],
  );

  if (!ty) return null;

  const update = (patch: Partial<typeof ty>) =>
    commit({ typography: { ...ty, ...patch } });

  // remove letterSpacing without assigning `undefined` (exactOptionalPropertyTypes)
  const clearLetterSpacing = () => {
    const { letterSpacing: _omit, ...rest } = ty;
    commit({ typography: rest });
  };

  // ---- font family ---- (a raw stack string, or a $ref to a fontFamily token)
  const familyIsRef = typeof ty.fontFamily !== "string";
  const familyValue = familyIsRef ? (ty.fontFamily as { $ref: string }).$ref : "__custom__";
  const familyStack = typeof ty.fontFamily === "string" ? ty.fontFamily : "";

  // ---- font size ----
  const fs = ty.fontSize;
  const sizeMode: "scale" | "fixed" | "fluid" = isRefValue(fs)
    ? "scale"
    : isFluidValue(fs)
      ? "fluid"
      : "fixed";
  const fixedSize: DimensionValue = "dimension" in fs ? fs : rem(1);

  const setSizeMode = (mode: "scale" | "fixed" | "fluid") => {
    if (mode === sizeMode) return;
    if (mode === "scale") update({ fontSize: sizes[0] ? { $ref: sizes[0].id } : fixedSize });
    else if (mode === "fixed") update({ fontSize: fixedSize });
    else update({ fontSize: { fluid: defaultFluid(isFluidValue(fs) ? fs.fluid.min : fixedSize) } });
  };

  return (
    <div>
      <EditRow label="Font family">
        <select
          value={familyValue}
          onChange={(e) => {
            const v = e.target.value;
            update({ fontFamily: v === "__custom__" ? familyStack || "Inter, system-ui, sans-serif" : { $ref: v } });
          }}
          className={`${fieldCls} w-full cursor-pointer`}
        >
          {families.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
          <option value="__custom__">Custom…</option>
        </select>
        {!familyIsRef && (
          <input
            defaultValue={familyStack}
            placeholder="Inter, system-ui, sans-serif"
            onBlur={(e) => e.target.value !== familyStack && update({ fontFamily: e.target.value })}
            className={`${fieldCls} mt-1.5 w-full font-mono text-[12px]`}
          />
        )}
      </EditRow>

      <EditRow label="Font size">
        <div className="mb-1.5 flex gap-1">
          {(["scale", "fixed", "fluid"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSizeMode(m)}
              className={`rounded-md px-2 py-1 text-[12px] capitalize ${
                sizeMode === m ? "bg-primary text-white" : "border border-line text-muted hover:text-strong"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        {sizeMode === "scale" && (
          <select
            value={isRefValue(fs) ? fs.$ref : ""}
            onChange={(e) => update({ fontSize: { $ref: e.target.value } })}
            className={`${fieldCls} w-full cursor-pointer`}
          >
            {sizes.length === 0 && <option value="">No font-size tokens yet</option>}
            {sizes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        {sizeMode === "fixed" && (
          <div className="flex items-center gap-1.5">
            <NumberField
              value={fixedSize.dimension}
              step={fixedSize.unit === "px" ? 1 : 0.125}
              onCommit={(n) => update({ fontSize: { dimension: n, unit: fixedSize.unit } })}
            />
            <select
              value={fixedSize.unit}
              onChange={(e) => update({ fontSize: { dimension: fixedSize.dimension, unit: e.target.value as DimensionValue["unit"] } })}
              className={`${fieldCls} cursor-pointer`}
            >
              {DIM_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        )}
        {sizeMode === "fluid" && isFluidValue(fs) && (
          <FluidEditor spec={fs.fluid} onChange={(fluid) => update({ fontSize: { fluid } })} />
        )}
      </EditRow>

      <EditRow label="Weight">
        <select
          value={ty.fontWeight}
          onChange={(e) => update({ fontWeight: Number(e.target.value) })}
          className={`${fieldCls} cursor-pointer`}
        >
          {WEIGHTS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </EditRow>

      <EditRow label="Line height">
        <NumberField value={ty.lineHeight} step={0.05} min={0} onCommit={(n) => update({ lineHeight: n })} />
      </EditRow>

      <EditRow label="Letter spacing">
        {ty.letterSpacing ? (
          <div className="flex items-center gap-1.5">
            <NumberField
              value={ty.letterSpacing.dimension}
              step={0.005}
              onCommit={(n) => update({ letterSpacing: { dimension: n, unit: ty.letterSpacing!.unit } })}
            />
            <select
              value={ty.letterSpacing.unit}
              onChange={(e) => update({ letterSpacing: { dimension: ty.letterSpacing!.dimension, unit: e.target.value as DimensionValue["unit"] } })}
              className={`${fieldCls} cursor-pointer`}
            >
              {DIM_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={clearLetterSpacing}
              className="text-[12px] text-faint hover:text-strong"
            >
              Clear
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => update({ letterSpacing: { dimension: 0, unit: "em" } })}
            className="rounded-md border border-line px-2 py-1 text-[12px] text-primary hover:bg-page"
          >
            + Add letter spacing
          </button>
        )}
      </EditRow>
    </div>
  );
}
