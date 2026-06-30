"use client";

import type { AIRules } from "@yahoda/core";
import { TextField } from "./Controls";

function StringList({
  title,
  tone,
  items,
  onChange,
}: {
  title: string;
  tone: "do" | "avoid";
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const set = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)));
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));
  const add = () => onChange([...items, ""]);
  return (
    <div>
      <div
        className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${
          tone === "do" ? "text-green-700" : "text-red-700"
        }`}
      >
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <div className="flex-1">
              <TextField value={item} onCommit={(v) => set(i, v)} />
            </div>
            <button
              onClick={() => remove(i)}
              className="shrink-0 rounded px-1.5 text-[13px] text-faint hover:text-red-600"
              title="Remove"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={add}
        className="mt-1.5 rounded-md border border-line bg-white px-2 py-1 text-[12px] text-muted hover:text-strong"
      >
        + Add
      </button>
    </div>
  );
}

export function AiRulesEditor({
  rules,
  onChange,
}: {
  rules: AIRules;
  onChange: (next: AIRules) => void;
}) {
  return (
    <div className="space-y-4 py-1">
      <StringList
        title="Do"
        tone="do"
        items={rules.do}
        onChange={(items) => onChange({ ...rules, do: items })}
      />
      <StringList
        title="Avoid"
        tone="avoid"
        items={rules.avoid}
        onChange={(items) => onChange({ ...rules, avoid: items })}
      />
    </div>
  );
}
