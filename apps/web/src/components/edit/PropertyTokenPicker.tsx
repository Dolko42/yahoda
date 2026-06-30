"use client";

import { useMemo, useState } from "react";
import {
  type DesignSystem,
  type Token,
  type TokenType,
  resolveTokenValue,
} from "@yahoda/core";
import { useWorkspace } from "@/store/workspace";
import { formatTokenValue } from "@/lib/format";
import { defaultNamePrefix, makeToken, validateTokenName } from "@/lib/tokens";
import { useEscape } from "@/lib/useEscape";

/** A small visual for a token: a color chip, or a compact value label. */
export function TokenSwatch({ ds, tokenId }: { ds: DesignSystem; tokenId: string }) {
  const resolved = resolveTokenValue(ds, tokenId);
  if (resolved.ok && "color" in resolved.value) {
    return (
      <span
        className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-line"
        style={{ backgroundColor: resolved.value.color }}
      />
    );
  }
  return (
    <span className="font-mono text-[10px] text-faint">
      {resolved.ok ? formatTokenValue(resolved.value) : "—"}
    </span>
  );
}

const TIER_ORDER: Token["tier"][] = ["primitive", "semantic", "component"];

interface Props {
  ds: DesignSystem;
  tokenType: TokenType;
  /** the token currently powering this property (resolved at the active scope), or null */
  currentTokenId: string | null;
  /** whether the current value is inherited (vs set at this scope) — for the label */
  inherited?: boolean;
  onSelect: (tokenId: string) => void;
  disabled?: boolean;
}

/**
 * Lets a user choose which token powers a property. Lists compatible tokens (same type),
 * grouped by tier, with search and an inline "create new token" that is assigned immediately.
 * The word "binding" never appears — users pick the token that powers the property.
 */
export function PropertyTokenPicker({
  ds,
  tokenType,
  currentTokenId,
  inherited,
  onSelect,
  disabled,
}: Props) {
  const createToken = useWorkspace((s) => s.createToken);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEscape(() => setOpen(false));

  const compatible = useMemo(
    () => ds.tokens.filter((t) => t.type === tokenType),
    [ds.tokens, tokenType],
  );
  const q = query.trim().toLowerCase();
  const filtered = compatible.filter((t) => !q || t.name.toLowerCase().includes(q));
  const current = currentTokenId ? ds.tokens.find((t) => t.id === currentTokenId) : undefined;

  const close = () => {
    setOpen(false);
    setQuery("");
    setCreating(false);
    setNewName("");
  };

  const nameError = creating ? validateTokenName(newName, ds.tokens) : null;

  const create = () => {
    if (nameError) return;
    const token = makeToken({ type: tokenType, name: newName.trim() });
    createToken(token);
    onSelect(token.id);
    close();
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-line bg-white px-2 py-1.5 text-left text-[13px] text-strong hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex min-w-0 items-center gap-2">
          {current ? <TokenSwatch ds={ds} tokenId={current.id} /> : null}
          <span className="truncate font-mono text-[12px]">
            {current ? current.name : "Choose a token"}
          </span>
        </span>
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-faint">
          {inherited ? "inherited" : current ? "set" : ""}
        </span>
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute left-0 z-20 mt-1 w-72 rounded-lg border border-line bg-surface shadow-app-2">
            <div className="border-b border-line p-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${tokenType} tokens…`}
                className="w-full rounded-md border border-line bg-page px-2 py-1 text-[13px] text-strong outline-none placeholder:text-faint focus:border-primary"
              />
            </div>

            <div className="max-h-64 overflow-y-auto p-1">
              {filtered.length === 0 && (
                <div className="px-2 py-3 text-[12px] text-faint">No compatible tokens.</div>
              )}
              {TIER_ORDER.map((tier) => {
                const items = filtered.filter((t) => t.tier === tier);
                if (items.length === 0) return null;
                return (
                  <div key={tier} className="mb-1">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
                      {tier}
                    </div>
                    {items.map((t) => {
                      const active = t.id === currentTokenId;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            onSelect(t.id);
                            close();
                          }}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] ${
                            active ? "bg-primary text-white" : "text-strong hover:bg-page"
                          }`}
                        >
                          <TokenSwatch ds={ds} tokenId={t.id} />
                          <span className="truncate font-mono text-[12px]">{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-line p-2">
              {creating ? (
                <div className="space-y-1.5">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && create()}
                    placeholder={`${defaultNamePrefix(tokenType)}.new`}
                    className="w-full rounded-md border border-line bg-page px-2 py-1 font-mono text-[12px] text-strong outline-none focus:border-primary"
                  />
                  {nameError && <div className="text-[11px] text-red-600">{nameError}</div>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={create}
                      disabled={!!nameError || !newName.trim()}
                      className="rounded-md bg-primary px-2.5 py-1 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-40"
                    >
                      Create &amp; assign
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreating(false);
                        setNewName("");
                      }}
                      className="rounded-md border border-line px-2.5 py-1 text-[12px] text-muted hover:text-strong"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCreating(true);
                    setNewName(`${defaultNamePrefix(tokenType)}.`);
                  }}
                  className="w-full rounded-md px-2 py-1.5 text-left text-[13px] text-primary hover:bg-page"
                >
                  + Create new {tokenType} token
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
