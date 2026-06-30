"use client";

import { type DesignSystem, type Token, resolveTokenValue } from "@yahoda/core";
import { useWorkspace } from "@/store/workspace";
import { ColorField, NumberField, SelectField, TextField } from "./Controls";

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

  if ("dimension" in value) {
    return (
      <div>
        {aliasNote}
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

  return (
    <div className="text-[12px] text-faint">
      Structured editing for {token.type} tokens arrives in a later phase.
    </div>
  );
}
