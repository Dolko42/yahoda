"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  type DesignSystem,
  type Token,
  getColorStep,
  getPrimitiveSourceForSemantic,
  groupPrimitiveColorsByFamily,
  isPrimitiveColor,
  isSemanticColor,
  resolveColor,
} from "@yahoda/core";
import { useWorkspace } from "@/store/workspace";
import { TokenSwatch } from "./edit/PropertyTokenPicker";
import {
  makePrimitiveColor,
  makeSemanticColor,
  primitiveColorName,
  semanticColorName,
  validateTokenName,
} from "@/lib/tokens";

/**
 * Colors-specific navigator. Primitive colors are grouped into collapsible family palettes
 * (blue, slate, …) sorted by shade; semantic colors are listed separately with their bound
 * primitive shown alongside. Creating a color makes the user choose primitive vs semantic
 * up front — primitives hold a hex, semantics reference a primitive.
 */

type CreateMode = "primitive" | "semantic";

export function ColorsSidebar() {
  const ds = useWorkspace((s) => s.ds);
  const selection = useWorkspace((s) => s.selection);
  const select = useWorkspace((s) => s.select);
  const createToken = useWorkspace((s) => s.createToken);
  const selectedId = selection?.kind === "token" ? selection.id : null;

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<CreateMode | null>(null);

  const q = query.trim().toLowerCase();
  const colors = useMemo(() => ds.tokens.filter((t) => t.type === "color"), [ds.tokens]);
  const matches = (t: Token) => !q || t.name.toLowerCase().includes(q);

  const families = useMemo(
    () => groupPrimitiveColorsByFamily(colors).map((g) => ({
      ...g,
      tokens: g.tokens.filter(matches),
    })).filter((g) => g.tokens.length > 0),
    [colors, q],
  );
  const semantics = useMemo(
    () => colors.filter((t) => isSemanticColor(t) && matches(t)).sort((a, b) => a.name.localeCompare(b.name)),
    [colors, q],
  );

  return (
    <nav className="flex w-64 shrink-0 flex-col border-r border-line bg-surface">
      <div className="px-3 pt-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search colors…"
          className="w-full rounded-lg border border-line bg-page px-3 py-1.5 text-[13px] text-strong outline-none placeholder:text-faint focus:border-primary"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {/* Primitive palettes */}
        <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
          Primitive
        </div>
        {families.length === 0 ? (
          <div className="px-2 py-3 text-[13px] text-faint">No primitive colors.</div>
        ) : (
          <div className="space-y-1">
            {families.map((g) => (
              <FamilyGroup
                key={g.family}
                ds={ds}
                family={g.family}
                tokens={g.tokens}
                selectedId={selectedId}
                onSelect={(id) => select({ kind: "token", id })}
              />
            ))}
          </div>
        )}

        {/* Semantic colors */}
        <div className="mt-4 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
          Semantic
        </div>
        {semantics.length === 0 ? (
          <div className="px-2 py-3 text-[13px] text-faint">No semantic colors.</div>
        ) : (
          <ul className="space-y-0.5">
            {semantics.map((t) => (
              <SemanticRow
                key={t.id}
                ds={ds}
                token={t}
                active={t.id === selectedId}
                onSelect={() => select({ kind: "token", id: t.id })}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Create */}
      <div className="border-t border-line p-2">
        {mode ? (
          <ColorCreator
            ds={ds}
            mode={mode}
            setMode={setMode}
            onCreate={(token) => {
              createToken(token);
              select({ kind: "token", id: token.id });
              setMode(null);
            }}
            onCancel={() => setMode(null)}
          />
        ) : (
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => setMode("primitive")}
              className="w-full rounded-md px-2 py-1.5 text-left text-[13px] text-primary hover:bg-page"
            >
              + New primitive color
            </button>
            <button
              onClick={() => setMode("semantic")}
              className="w-full rounded-md px-2 py-1.5 text-left text-[13px] text-primary hover:bg-page"
            >
              + New semantic color
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

function FamilyGroup({
  ds,
  family,
  tokens,
  selectedId,
  onSelect,
}: {
  ds: DesignSystem;
  family: string;
  tokens: Token[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[12px] font-medium capitalize text-strong hover:bg-page"
      >
        <span className="w-3 shrink-0 text-faint">{open ? "▾" : "▸"}</span>
        <span className="truncate">{family}</span>
        <span className="ml-auto shrink-0 text-[11px] text-faint">{tokens.length}</span>
      </button>
      {open && (
        <ul className="mt-0.5 space-y-0.5 pl-3">
          {tokens.map((t) => {
            const active = t.id === selectedId;
            const step = getColorStep(t);
            return (
              <li key={t.id}>
                <button
                  onClick={() => onSelect(t.id)}
                  aria-current={active ? "true" : undefined}
                  title={t.name}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] ${
                    active ? "bg-primary text-white" : "text-strong hover:bg-page"
                  }`}
                >
                  <TokenSwatch ds={ds} tokenId={t.id} />
                  <span className="font-mono text-[12px]">{step ?? t.name.split(".").pop()}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SemanticRow({
  ds,
  token,
  active,
  onSelect,
}: {
  ds: DesignSystem;
  token: Token;
  active: boolean;
  onSelect: () => void;
}) {
  const source = getPrimitiveSourceForSemantic(ds, token.id);
  const hex = resolveColor(ds, token.id);
  const sourceLabel = source
    ? source.name.replace(/^palette\./, "")
    : hex ?? "raw";
  return (
    <li>
      <button
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        title={token.name}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] ${
          active ? "bg-primary text-white" : "text-strong hover:bg-page"
        }`}
      >
        <TokenSwatch ds={ds} tokenId={token.id} />
        <span className="truncate font-mono text-[12px]">{token.name.replace(/^color\./, "")}</span>
        <span
          className={`ml-auto shrink-0 truncate font-mono text-[10px] ${
            active ? "text-white/70" : "text-faint"
          }`}
        >
          {sourceLabel}
        </span>
      </button>
    </li>
  );
}

function ColorCreator({
  ds,
  mode,
  setMode,
  onCreate,
  onCancel,
}: {
  ds: DesignSystem;
  mode: CreateMode;
  setMode: (m: CreateMode) => void;
  onCreate: (token: Token) => void;
  onCancel: () => void;
}) {
  // primitive fields
  const [family, setFamily] = useState("");
  const [step, setStep] = useState("500");
  const [pHex, setPHex] = useState("#3B82F6");
  // semantic fields
  const [role, setRole] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [sHex, setSHex] = useState("#3B82F6");

  const primitives = useMemo(
    () => ds.tokens.filter(isPrimitiveColor).sort((a, b) => a.name.localeCompare(b.name)),
    [ds.tokens],
  );

  const previewName =
    mode === "primitive"
      ? family.trim()
        ? primitiveColorName(family, step)
        : ""
      : role.trim()
        ? semanticColorName(role)
        : "";
  const nameError = previewName ? validateTokenName(previewName, ds.tokens) : "Fill in the fields.";

  // reset source hex fallback disabled state
  const submit = () => {
    if (nameError) return;
    if (mode === "primitive") {
      onCreate(makePrimitiveColor({ family, step, hex: pHex }));
    } else {
      onCreate(
        makeSemanticColor({ role, ...(sourceId ? { sourceId } : { hex: sHex }) }),
      );
    }
  };

  const inputCls =
    "w-full rounded-md border border-line bg-white px-2 py-1 text-[12px] text-strong outline-none focus:border-primary";

  const Label = ({ children }: { children: ReactNode }) => (
    <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-faint">
      {children}
    </div>
  );

  return (
    <div className="space-y-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">
        New {mode} color
      </div>

      {/* mode toggle */}
      <div className="flex gap-1 rounded-md bg-page p-0.5">
        {(["primitive", "semantic"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded px-2 py-1 text-[11px] font-medium capitalize ${
              mode === m ? "bg-primary text-white" : "text-muted hover:text-strong"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "primitive" ? (
        <>
          <div>
            <Label>Family</Label>
            <input
              autoFocus
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              placeholder="blue"
              className={`${inputCls} font-mono`}
            />
          </div>
          <div>
            <Label>Shade</Label>
            <input
              value={step}
              onChange={(e) => setStep(e.target.value)}
              placeholder="500"
              className={`${inputCls} font-mono`}
            />
          </div>
          <div>
            <Label>Hex</Label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={pHex}
                onChange={(e) => setPHex(e.target.value)}
                className="h-8 w-9 shrink-0 cursor-pointer rounded border border-line bg-white"
              />
              <input
                value={pHex}
                onChange={(e) => setPHex(e.target.value)}
                className={`${inputCls} font-mono`}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <Label>Role</Label>
            <input
              autoFocus
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="primary"
              className={`${inputCls} font-mono`}
            />
          </div>
          <div>
            <Label>Source primitive</Label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className={inputCls}
            >
              <option value="">Raw hex (no source)</option>
              {primitives.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {!sourceId && (
            <div>
              <Label>Hex</Label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={sHex}
                  onChange={(e) => setSHex(e.target.value)}
                  className="h-8 w-9 shrink-0 cursor-pointer rounded border border-line bg-white"
                />
                <input
                  value={sHex}
                  onChange={(e) => setSHex(e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>
          )}
        </>
      )}

      {previewName && (
        <div className="rounded-md bg-page px-2 py-1 font-mono text-[11px]">
          {nameError && nameError !== "Fill in the fields." ? (
            <span className="text-red-600">{nameError}</span>
          ) : (
            <span className="text-muted">→ {previewName}</span>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-0.5">
        <button
          onClick={submit}
          disabled={!!nameError}
          className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          Create
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-line bg-white px-3 py-1.5 text-[12px] text-muted hover:text-strong"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
