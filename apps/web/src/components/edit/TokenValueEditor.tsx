"use client";

import { type DesignSystem, type Token, isFluidValue, resolveTokenValue } from "@yahoda/core";
import { useWorkspace } from "@/store/workspace";
import { ColorField, NumberField, SelectField, TextField } from "./Controls";
import { FluidEditor, TypographyEditor, defaultFluid } from "./TypographyEditor";

const DIM_UNITS = ["px", "rem", "em", "%"] as const;
const DUR_UNITS = ["ms", "s"] as const;

/**
 * Edits a token's value. For aliased tokens the store redirects the edit to the
 * resolved source token, so changing e.g. color.primary cascades to every consumer.
 */
export function TokenValueEditor({ ds, token }: { ds: DesignSystem; token: Token }) {
  const patchTokenValue = useWorkspace((s) => s.patchTokenValue);
  const resolved = resolveTokenValue(ds, token.id);
  const isAlias = resolved.ok && resolved.token.id !== token.id;

  if (!resolved.ok) {
    return <div className="text-[12px] text-red-600">Unresolved ({resolved.error}).</div>;
  }
  const value = resolved.value;
  const commit = (v: Parameters<typeof patchTokenValue>[1]) => patchTokenValue(token.id, v);

  const aliasNote = isAlias ? (
    <div className="mb-2 text-[11px] text-faint">
      Aliases <span className="font-mono">{resolved.token.name}</span> — editing updates the source.
    </div>
  ) : null;

  if ("color" in value) {
    return (
      <div>
        {aliasNote}
        <ColorField value={value.color} onCommit={(c) => commit({ color: c })} />
      </div>
    );
  }

  if ("fontFamily" in value) {
    return (
      <div>
        {aliasNote}
        <TextField
          value={value.fontFamily}
          mono
          placeholder="Inter, system-ui, sans-serif"
          onCommit={(s) => commit({ fontFamily: s })}
        />
        <div
          className="mt-2 truncate rounded-md border border-line bg-page px-2 py-3 text-strong"
          style={{ fontFamily: value.fontFamily }}
        >
          The quick brown fox jumps over the lazy dog
        </div>
      </div>
    );
  }

  // dimension tokens can be a fixed size or a fluid (clamp) size — a toggle switches modes.
  if ("dimension" in value || isFluidValue(value)) {
    const fluid = isFluidValue(value);
    return (
      <div>
        {aliasNote}
        <div className="mb-1.5 flex gap-1">
          {(["fixed", "fluid"] as const).map((m) => {
            const on = (m === "fluid") === fluid;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  if (on) return;
                  commit(m === "fluid" ? { fluid: defaultFluid("dimension" in value ? value : undefined) } : (isFluidValue(value) ? value.fluid.min : { dimension: 8, unit: "px" }));
                }}
                className={`rounded-md px-2 py-1 text-[12px] capitalize ${
                  on ? "bg-primary text-white" : "border border-line text-muted hover:text-strong"
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
        {isFluidValue(value) ? (
          <FluidEditor spec={value.fluid} onChange={(f) => commit({ fluid: f })} />
        ) : "dimension" in value ? (
          <div className="flex items-center gap-2">
            <NumberField
              value={value.dimension}
              step={value.unit === "px" ? 1 : 0.125}
              onCommit={(n) => commit({ dimension: n, unit: value.unit })}
            />
            <SelectField
              value={value.unit}
              options={DIM_UNITS}
              onCommit={(u) => commit({ dimension: value.dimension, unit: u })}
            />
          </div>
        ) : null}
      </div>
    );
  }

  if ("duration" in value) {
    return (
      <div className="flex items-center gap-2">
        <NumberField
          value={value.duration}
          min={0}
          onCommit={(n) => commit({ duration: n, unit: value.unit })}
        />
        <SelectField
          value={value.unit}
          options={DUR_UNITS}
          onCommit={(u) => commit({ duration: value.duration, unit: u })}
        />
      </div>
    );
  }

  if ("opacity" in value) {
    return (
      <NumberField
        value={value.opacity}
        step={0.05}
        min={0}
        onCommit={(n) => commit({ opacity: Math.max(0, Math.min(1, n)) })}
      />
    );
  }

  if ("zIndex" in value) {
    return <NumberField value={value.zIndex} onCommit={(n) => commit({ zIndex: n })} />;
  }

  if ("easing" in value && typeof value.easing === "string") {
    return <TextField value={value.easing} mono onCommit={(s) => commit({ easing: s })} />;
  }

  if ("typography" in value) {
    return (
      <div>
        {aliasNote}
        <TypographyEditor ds={ds} token={resolved.token} commit={commit} />
      </div>
    );
  }

  return (
    <div className="text-[12px] text-faint">
      Structured editing for {token.type} tokens arrives in a later phase.
    </div>
  );
}
