"use client";

import { useEffect, useState } from "react";

const fieldCls =
  "w-full rounded-md border border-line bg-white px-2 py-1 text-[13px] text-strong outline-none focus:border-primary";

/** Text input that commits on blur / Enter. */
export function TextField({
  value,
  onCommit,
  placeholder,
  mono,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={`${fieldCls} ${mono ? "font-mono text-[12px]" : ""}`}
    />
  );
}

export function TextArea({
  value,
  onCommit,
  rows = 4,
}: {
  value: string;
  onCommit: (v: string) => void;
  rows?: number;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <textarea
      value={draft}
      rows={rows}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      className={`${fieldCls} resize-y font-mono text-[12px] leading-relaxed`}
    />
  );
}

export function NumberField({
  value,
  onCommit,
  step = 1,
  min,
}: {
  value: number;
  onCommit: (v: number) => void;
  step?: number;
  min?: number;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <input
      type="number"
      value={draft}
      step={step}
      min={min}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const n = Number(draft);
        if (!Number.isNaN(n) && n !== value) onCommit(n);
      }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={`${fieldCls} w-24`}
    />
  );
}

export function SelectField<T extends string>({
  value,
  options,
  onCommit,
}: {
  value: T;
  options: readonly T[];
  onCommit: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onCommit(e.target.value as T)}
      className={`${fieldCls} cursor-pointer`}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function ColorField({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(draft);
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={isHex ? draft : "#000000"}
        onChange={(e) => {
          setDraft(e.target.value);
          onCommit(e.target.value);
        }}
        className="h-8 w-10 cursor-pointer rounded border border-line bg-white p-0.5"
      />
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== value && onCommit(draft)}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className={`${fieldCls} w-28 font-mono text-[12px]`}
      />
    </div>
  );
}

export function EditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line/60 py-2.5">
      <div className="mb-1 text-[11px] uppercase tracking-wide text-faint">{label}</div>
      {children}
    </div>
  );
}
