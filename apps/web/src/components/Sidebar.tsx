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

interface Category {
  id: CategoryId;
  label: string;
  /** token categories carry create config; component category does not */
  create?: { type: TokenType; namePrefix: string; group: string };
  match?: (t: Token) => boolean;
}

const CATEGORIES: Category[] = [
  { id: "colors", label: "Colors", create: { type: "color", namePrefix: "color", group: "Brand" },
    match: (t) => t.type === "color" },
  { id: "typography", label: "Typography",
    create: { type: "typography", namePrefix: "typography", group: "Typography" },
    match: (t) => t.type === "typography" },
  { id: "spacing", label: "Spacing", create: { type: "dimension", namePrefix: "spacing", group: "Spacing" },
    match: (t) => t.type === "dimension" && !t.name.startsWith("radius") },
  { id: "radius", label: "Radius", create: { type: "dimension", namePrefix: "radius", group: "Radius" },
    match: (t) => t.type === "dimension" && t.name.startsWith("radius") },
  { id: "effects", label: "Effects", create: { type: "shadow", namePrefix: "shadow", group: "Elevation" },
    match: (t) => ["shadow", "border", "opacity"].includes(t.type) },
  { id: "motion", label: "Motion", create: { type: "duration", namePrefix: "duration", group: "Motion" },
    match: (t) => ["duration", "easing"].includes(t.type) },
  { id: "components", label: "Components" },
];

const TIERS: Token["tier"][] = ["primitive", "semantic", "component"];

export function Sidebar() {
  const ds = useWorkspace((s) => s.ds);
  const selection = useWorkspace((s) => s.selection);
  const select = useWorkspace((s) => s.select);
  const createToken = useWorkspace((s) => s.createToken);

  const [active, setActive] = useState<CategoryId>("colors");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
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
    setCreating(false);
    setNewName("");
  };
  const nameError = creating && category.create ? validateTokenName(newName, ds.tokens) : null;
  const submitCreate = () => {
    if (!category.create || nameError) return;
    const token = makeToken({
      type: category.create.type,
      name: newName.trim(),
      group: category.create.group,
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
            selectedId={selection?.kind === "token" ? selection.id : null}
            onSelect={(id) => select({ kind: "token", id })}
          />
        )}

        {/* typography future placeholders */}
        {category.id === "typography" && (
          <div className="mt-4 space-y-1 border-t border-line/60 pt-3">
            <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-faint">
              Coming soon
            </div>
            {["Font families", "Base styles", "Semantic styles"].map((label) => (
              <div key={label} className="cursor-not-allowed px-2 py-1.5 text-[13px] text-faint">
                {label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* + New action */}
      <div className="border-t border-line p-2">
        {category.id === "components" ? (
          <button
            disabled
            title="Creating components arrives in a later phase"
            className="w-full cursor-not-allowed rounded-md px-2 py-1.5 text-left text-[13px] text-faint"
          >
            + New Component
          </button>
        ) : creating ? (
          <div className="space-y-1.5">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCreate();
                if (e.key === "Escape") resetCreate();
              }}
              placeholder={`${category.create?.namePrefix}.new`}
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
          <button
            onClick={() => {
              setCreating(true);
              setNewName(`${category.create?.namePrefix}.`);
            }}
            className="w-full rounded-md px-2 py-1.5 text-left text-[13px] text-primary hover:bg-page"
          >
            + New {category.label.replace(/s$/, "")}
          </button>
        )}
      </div>
    </nav>
  );
}

function TokenList({
  tokens,
  ds,
  groupByTier,
  selectedId,
  onSelect,
}: {
  tokens: Token[];
  ds: DesignSystem;
  groupByTier: boolean;
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
