"use client";

import { useMemo, useState } from "react";
import type { DesignSystem, Token, TokenType } from "@yahoda/core";
import { useWorkspace } from "@/store/workspace";
import { TokenSwatch } from "./edit/PropertyTokenPicker";
import { makeToken, validateTokenName } from "@/lib/tokens";

/**
 * Toolbox-style system navigator. Instead of a document tree, the left rail is a set of
 * system categories (Colors, Typography, Spacing, …, Components). Each category has search,
 * its relevant items, and a "+ New" action. Patterns/Docs are reachable but de-emphasized.
 */

type CategoryId =
  | "colors"
  | "typography"
  | "spacing"
  | "radius"
  | "effects"
  | "motion"
  | "components";

interface CreateCfg {
  type: TokenType;
  namePrefix: string;
  group: string;
  /** button label, e.g. "Font family" */
  label: string;
}

interface TokenGroup {
  label: string;
  filter: (t: Token) => boolean;
}

interface Category {
  id: CategoryId;
  label: string;
  /** one or more "+ New" actions; empty for the component category */
  creates: CreateCfg[];
  match?: (t: Token) => boolean;
  /** optional sub-grouping of the list (falls back to tier/flat) */
  groups?: TokenGroup[];
}

const isFontSize = (t: Token) => t.type === "dimension" && t.name.startsWith("fontSize");

const CATEGORIES: Category[] = [
  { id: "colors", label: "Colors",
    creates: [{ type: "color", namePrefix: "color", group: "Brand", label: "Color" }],
    match: (t) => t.type === "color" },
  { id: "typography", label: "Typography",
    creates: [
      { type: "fontFamily", namePrefix: "fontFamily", group: "Font family", label: "Font family" },
      { type: "dimension", namePrefix: "fontSize", group: "Font size", label: "Font size" },
      { type: "typography", namePrefix: "typography", group: "Typography", label: "Text style" },
    ],
    match: (t) => t.type === "typography" || t.type === "fontFamily" || isFontSize(t),
    groups: [
      { label: "Font families", filter: (t) => t.type === "fontFamily" },
      { label: "Sizes", filter: isFontSize },
      { label: "Text styles", filter: (t) => t.type === "typography" },
    ] },
  { id: "spacing", label: "Spacing",
    creates: [{ type: "dimension", namePrefix: "spacing", group: "Spacing", label: "Spacing" }],
    match: (t) => t.type === "dimension" && !t.name.startsWith("radius") && !isFontSize(t) },
  { id: "radius", label: "Radius",
    creates: [{ type: "dimension", namePrefix: "radius", group: "Radius", label: "Radius" }],
    match: (t) => t.type === "dimension" && t.name.startsWith("radius") },
  { id: "effects", label: "Effects",
    creates: [{ type: "shadow", namePrefix: "shadow", group: "Elevation", label: "Shadow" }],
    match: (t) => ["shadow", "border", "opacity"].includes(t.type) },
  { id: "motion", label: "Motion",
    creates: [{ type: "duration", namePrefix: "duration", group: "Motion", label: "Duration" }],
    match: (t) => ["duration", "easing"].includes(t.type) },
  { id: "components", label: "Components", creates: [] },
];

const TIERS: Token["tier"][] = ["primitive", "semantic", "component"];

export function Sidebar() {
  const ds = useWorkspace((s) => s.ds);
  const selection = useWorkspace((s) => s.selection);
  const select = useWorkspace((s) => s.select);
  const createToken = useWorkspace((s) => s.createToken);

  const [active, setActive] = useState<CategoryId>("colors");
  const [query, setQuery] = useState("");
  const [createCfg, setCreateCfg] = useState<CreateCfg | null>(null);
  const [newName, setNewName] = useState("");

  const category = CATEGORIES.find((c) => c.id === active)!;
  const q = query.trim().toLowerCase();

  const tokens = useMemo(
    () => (category.match ? ds.tokens.filter(category.match) : []),
    [ds.tokens, category],
  );
  const filteredTokens = tokens.filter((t) => !q || t.name.toLowerCase().includes(q));
  const filteredComponents = ds.components.filter((c) => !q || c.name.toLowerCase().includes(q));

  const resetCreate = () => {
    setCreateCfg(null);
    setNewName("");
  };
  const beginCreate = (cfg: CreateCfg) => {
    setCreateCfg(cfg);
    setNewName(`${cfg.namePrefix}.`);
  };
  const nameError = createCfg ? validateTokenName(newName, ds.tokens) : null;
  const submitCreate = () => {
    if (!createCfg || nameError) return;
    const token = makeToken({
      type: createCfg.type,
      name: newName.trim(),
      group: createCfg.group,
    });
    createToken(token);
    select({ kind: "token", id: token.id });
    resetCreate();
  };

  return (
    <nav className="flex w-64 shrink-0 flex-col border-r border-line bg-surface">
      {/* category rail */}
      <div className="flex flex-wrap gap-1 border-b border-line p-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setActive(c.id);
              setQuery("");
              resetCreate();
            }}
            className={`rounded-md px-2 py-1 text-[12px] ${
              active === c.id ? "bg-primary text-white" : "text-muted hover:bg-page hover:text-strong"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* search */}
      <div className="px-3 pt-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${category.label.toLowerCase()}…`}
          className="w-full rounded-lg border border-line bg-page px-3 py-1.5 text-[13px] text-strong outline-none placeholder:text-faint focus:border-primary"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {category.id === "components" ? (
          <ComponentList
            items={filteredComponents.map((c) => ({ id: c.id, name: c.name, status: c.status }))}
            selectedId={selection?.kind === "component" ? selection.id : null}
            onSelect={(id) => select({ kind: "component", id })}
          />
        ) : (
          <TokenList
            tokens={filteredTokens}
            ds={ds}
            groupByTier={category.id === "colors"}
            groups={category.groups}
            selectedId={selection?.kind === "token" ? selection.id : null}
            onSelect={(id) => select({ kind: "token", id })}
          />
        )}
      </div>

      {/* + New action(s) */}
      <div className="border-t border-line p-2">
        {category.id === "components" ? (
          <button
            disabled
            title="Creating components arrives in a later phase"
            className="w-full cursor-not-allowed rounded-md px-2 py-1.5 text-left text-[13px] text-faint"
          >
            + New Component
          </button>
        ) : createCfg ? (
          <div className="space-y-1.5">
            <div className="px-1 text-[10px] uppercase tracking-wide text-faint">
              New {createCfg.label.toLowerCase()}
            </div>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCreate();
                if (e.key === "Escape") resetCreate();
              }}
              placeholder={`${createCfg.namePrefix}.new`}
              className="w-full rounded-md border border-line bg-white px-2 py-1 font-mono text-[12px] text-strong outline-none focus:border-primary"
            />
            {nameError && <div className="text-[11px] text-red-600">{nameError}</div>}
            <div className="flex gap-2">
              <button
                onClick={submitCreate}
                disabled={!!nameError || !newName.trim()}
                className="rounded-md bg-primary px-2.5 py-1 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-40"
              >
                Create
              </button>
              <button
                onClick={resetCreate}
                className="rounded-md border border-line bg-white px-2.5 py-1 text-[12px] text-muted hover:text-strong"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {category.creates.map((cfg) => (
              <button
                key={cfg.label}
                onClick={() => beginCreate(cfg)}
                className="w-full rounded-md px-2 py-1.5 text-left text-[13px] text-primary hover:bg-page"
              >
                + New {cfg.label.toLowerCase()}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

function TokenList({
  tokens,
  ds,
  groupByTier,
  groups,
  selectedId,
  onSelect,
}: {
  tokens: Token[];
  ds: DesignSystem;
  groupByTier: boolean;
  groups?: TokenGroup[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (tokens.length === 0) {
    return <div className="px-2 py-6 text-[13px] text-faint">No tokens yet.</div>;
  }

  const Row = ({ t }: { t: Token }) => {
    const active = t.id === selectedId;
    return (
      <li>
        <button
          onClick={() => onSelect(t.id)}
          aria-current={active ? "true" : undefined}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] ${
            active ? "bg-primary text-white" : "text-strong hover:bg-page"
          }`}
        >
          <TokenSwatch ds={ds} tokenId={t.id} />
          <span className="truncate font-mono text-[12px]">{t.name}</span>
        </button>
      </li>
    );
  };

  if (groups) {
    return (
      <div className="space-y-3">
        {groups.map((g) => {
          const items = tokens.filter(g.filter).sort((a, b) => a.name.localeCompare(b.name));
          if (items.length === 0) return null;
          return (
            <div key={g.label}>
              <div className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
                {g.label}
              </div>
              <ul className="space-y-0.5">
                {items.map((t) => (
                  <Row key={t.id} t={t} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    );
  }

  if (!groupByTier) {
    return (
      <ul className="space-y-0.5">
        {[...tokens].sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
          <Row key={t.id} t={t} />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-3">
      {TIERS.map((tier) => {
        const items = tokens.filter((t) => t.tier === tier).sort((a, b) => a.name.localeCompare(b.name));
        if (items.length === 0) return null;
        return (
          <div key={tier}>
            <div className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
              {tier}
            </div>
            <ul className="space-y-0.5">
              {items.map((t) => (
                <Row key={t.id} t={t} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function ComponentList({
  items,
  selectedId,
  onSelect,
}: {
  items: { id: string; name: string; status: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return <div className="px-2 py-6 text-[13px] text-faint">No components.</div>;
  }
  return (
    <ul className="space-y-0.5">
      {items.map((c) => {
        const active = c.id === selectedId;
        return (
          <li key={c.id}>
            <button
              onClick={() => onSelect(c.id)}
              aria-current={active ? "true" : undefined}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] ${
                active ? "bg-primary text-white" : "text-strong hover:bg-page"
              }`}
            >
              <span className="truncate">{c.name}</span>
              <span className={`ml-2 shrink-0 text-[10px] uppercase tracking-wide ${active ? "text-white/70" : "text-faint"}`}>
                {c.status}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
