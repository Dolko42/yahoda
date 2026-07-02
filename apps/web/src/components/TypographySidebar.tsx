"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  type DesignSystem,
  type Token,
  groupTypographyStylesByRole,
  isFontFamilyToken,
  isTypographyBaseToken,
  resolveTypographyToken,
} from "@yahoda/core";
import { useWorkspace } from "@/store/workspace";
import {
  fontFamilyName,
  makeBaseTypographyStyle,
  makeFontFamilyToken,
  makeSemanticTypographyStyle,
  typographyStyleName,
  validateTokenName,
} from "@/lib/tokens";

/**
 * Typography-specific navigator: a living stylesheet, not a flat token list. Font
 * families and base styles get their own sections; semantic text styles are grouped by
 * role (Display, Headings, Body, …). Creation is typed up front — font stack vs base
 * style vs text style — mirroring the Colors sidebar's primitive/semantic split.
 */

type CreateMode = "font" | "base" | "style";

const ROLE_LABELS: Record<string, string> = {
  display: "Display",
  heading: "Headings",
  body: "Body",
  label: "Labels",
  link: "Links",
  caption: "Caption",
  eyebrow: "Eyebrow",
};

const roleLabel = (role: string): string =>
  ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1);

export function TypographySidebar() {
  const ds = useWorkspace((s) => s.ds);
  const selection = useWorkspace((s) => s.selection);
  const select = useWorkspace((s) => s.select);
  const createToken = useWorkspace((s) => s.createToken);
  const selectedId = selection?.kind === "token" ? selection.id : null;

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<CreateMode | null>(null);

  const q = query.trim().toLowerCase();
  const matches = (t: Token) => !q || t.name.toLowerCase().includes(q);

  const fonts = useMemo(
    () => ds.tokens.filter((t) => isFontFamilyToken(t) && matches(t)).sort((a, b) => a.name.localeCompare(b.name)),
    [ds.tokens, q],
  );
  const bases = useMemo(
    () => ds.tokens.filter((t) => isTypographyBaseToken(t) && matches(t)).sort((a, b) => a.name.localeCompare(b.name)),
    [ds.tokens, q],
  );
  const roleGroups = useMemo(
    () =>
      groupTypographyStylesByRole(ds.tokens)
        .map((g) => ({ ...g, tokens: g.tokens.filter(matches) }))
        .filter((g) => g.tokens.length > 0),
    [ds.tokens, q],
  );

  const onSelect = (id: string) => select({ kind: "token", id });

  return (
    <nav className="flex w-64 shrink-0 flex-col border-r border-line bg-surface">
      <div className="px-3 pt-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search typography…"
          className="w-full rounded-lg border border-line bg-page px-3 py-1.5 text-[13px] text-strong outline-none placeholder:text-faint focus:border-primary"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {/* Font families */}
        <SectionLabel>Font Families</SectionLabel>
        {fonts.length === 0 ? (
          <EmptyNote>No font families.</EmptyNote>
        ) : (
          <ul className="space-y-0.5">
            {fonts.map((t) => (
              <FontRow key={t.id} token={t} active={t.id === selectedId} onSelect={() => onSelect(t.id)} />
            ))}
          </ul>
        )}

        {/* Base styles */}
        <SectionLabel className="mt-4">Base Styles</SectionLabel>
        {bases.length === 0 ? (
          <EmptyNote>No base styles.</EmptyNote>
        ) : (
          <ul className="space-y-0.5">
            {bases.map((t) => (
              <StyleRow
                key={t.id}
                ds={ds}
                token={t}
                label={t.name.replace(/^typography\./, "")}
                active={t.id === selectedId}
                onSelect={() => onSelect(t.id)}
              />
            ))}
          </ul>
        )}

        {/* Semantic text styles, grouped by role */}
        <SectionLabel className="mt-4">Text Styles</SectionLabel>
        {roleGroups.length === 0 ? (
          <EmptyNote>No text styles.</EmptyNote>
        ) : (
          <div className="space-y-1">
            {roleGroups.map((g) => (
              <RoleGroup
                key={g.role}
                ds={ds}
                label={roleLabel(g.role)}
                tokens={g.tokens}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create */}
      <div className="border-t border-line p-2">
        {mode ? (
          <TypographyCreator
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
            <CreateButton onClick={() => setMode("font")}>+ New font family</CreateButton>
            <CreateButton onClick={() => setMode("base")}>+ New base style</CreateButton>
            <CreateButton onClick={() => setMode("style")}>+ New text style</CreateButton>
          </div>
        )}
      </div>
    </nav>
  );
}

// --- small pieces ------------------------------------------------------------

function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-faint ${className}`}>
      {children}
    </div>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <div className="px-2 py-2 text-[13px] text-faint">{children}</div>;
}

function CreateButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-md px-2 py-1.5 text-left text-[13px] text-primary hover:bg-page"
    >
      {children}
    </button>
  );
}

function FontRow({ token, active, onSelect }: { token: Token; active: boolean; onSelect: () => void }) {
  const stack = "fontFamily" in token.value ? token.value.fontFamily : "";
  const primary = stack.split(",")[0]?.replace(/"/g, "").trim() ?? "";
  return (
    <li>
      <button
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        title={`${token.name} — ${stack}`}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] ${
          active ? "bg-primary text-white" : "text-strong hover:bg-page"
        }`}
      >
        <span
          className="grid h-5 w-5 shrink-0 place-items-center rounded border border-line bg-white text-[12px] font-semibold text-strong"
          style={{ fontFamily: stack }}
        >
          Aa
        </span>
        <span className="truncate font-mono text-[12px]">{token.name.replace(/^font\./, "")}</span>
        <span className={`ml-auto shrink-0 truncate text-[10px] ${active ? "text-white/70" : "text-faint"}`}>
          {primary}
        </span>
      </button>
    </li>
  );
}

function StyleRow({
  ds,
  token,
  label,
  active,
  onSelect,
}: {
  ds: DesignSystem;
  token: Token;
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  const resolved = resolveTypographyToken(ds, token.id);
  const sizeLabel =
    resolved.sources.fontSize.source === "default" ? "—" : resolved.style.fontSize;
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
        <span className="truncate font-mono text-[12px]">{label}</span>
        <span className={`ml-auto shrink-0 font-mono text-[10px] ${active ? "text-white/70" : "text-faint"}`}>
          {sizeLabel}
        </span>
      </button>
    </li>
  );
}

function RoleGroup({
  ds,
  label,
  tokens,
  selectedId,
  onSelect,
}: {
  ds: DesignSystem;
  label: string;
  tokens: Token[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[12px] font-medium text-strong hover:bg-page"
      >
        <span className="w-3 shrink-0 text-faint">{open ? "▾" : "▸"}</span>
        <span className="truncate">{label}</span>
        <span className="ml-auto shrink-0 text-[11px] text-faint">{tokens.length}</span>
      </button>
      {open && (
        <ul className="mt-0.5 space-y-0.5 pl-3">
          {tokens.map((t) => (
            <StyleRow
              key={t.id}
              ds={ds}
              token={t}
              label={t.name.replace(/^typography\./, "")}
              active={t.id === selectedId}
              onSelect={() => onSelect(t.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// --- typed creation ------------------------------------------------------------

function TypographyCreator({
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
  // font fields
  const [fontRole, setFontRole] = useState("");
  const [stack, setStack] = useState('"Inter", system-ui, sans-serif');
  // base fields
  const [baseRole, setBaseRole] = useState("");
  const [baseFontId, setBaseFontId] = useState("");
  // text style fields
  const [stylePath, setStylePath] = useState("");
  const [parentId, setParentId] = useState("");
  const [sizeRem, setSizeRem] = useState("1");

  const fonts = useMemo(
    () => ds.tokens.filter(isFontFamilyToken).sort((a, b) => a.name.localeCompare(b.name)),
    [ds.tokens],
  );
  const bases = useMemo(
    () => ds.tokens.filter(isTypographyBaseToken).sort((a, b) => a.name.localeCompare(b.name)),
    [ds.tokens],
  );

  const previewName =
    mode === "font"
      ? fontRole.trim() ? fontFamilyName(fontRole) : ""
      : mode === "base"
        ? baseRole.trim() ? typographyStyleName(`${baseRole.trim()}.base`) : ""
        : stylePath.trim() ? typographyStyleName(stylePath) : "";
  const sizeNum = Number(sizeRem);
  const sizeError =
    mode === "style" && !(Number.isFinite(sizeNum) && sizeNum > 0)
      ? "Font size must be a positive number."
      : null;
  const nameError = previewName
    ? validateTokenName(previewName, ds.tokens) ?? sizeError
    : "Fill in the fields.";

  const submit = () => {
    if (nameError) return;
    if (mode === "font") {
      onCreate(makeFontFamilyToken({ role: fontRole, stack }));
    } else if (mode === "base") {
      onCreate(
        makeBaseTypographyStyle({
          role: baseRole,
          ...(baseFontId ? { fontTokenId: baseFontId } : {}),
        }),
      );
    } else {
      onCreate(
        makeSemanticTypographyStyle({
          path: stylePath,
          ...(parentId ? { parentTokenId: parentId } : {}),
          fontSizeRem: sizeNum,
        }),
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

  const MODE_LABEL: Record<CreateMode, string> = {
    font: "font family",
    base: "base style",
    style: "text style",
  };

  return (
    <div className="space-y-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">
        New {MODE_LABEL[mode]}
      </div>

      {/* mode toggle */}
      <div className="flex gap-1 rounded-md bg-page p-0.5">
        {(["font", "base", "style"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded px-1.5 py-1 text-[11px] font-medium capitalize ${
              mode === m ? "bg-primary text-white" : "text-muted hover:text-strong"
            }`}
          >
            {m === "style" ? "Text style" : m}
          </button>
        ))}
      </div>

      {mode === "font" ? (
        <>
          <div>
            <Label>Role</Label>
            <input autoFocus value={fontRole} onChange={(e) => setFontRole(e.target.value)}
              placeholder="heading" className={`${inputCls} font-mono`} />
          </div>
          <div>
            <Label>Font stack</Label>
            <input value={stack} onChange={(e) => setStack(e.target.value)}
              placeholder='"Inter", system-ui, sans-serif' className={`${inputCls} font-mono`} />
          </div>
        </>
      ) : mode === "base" ? (
        <>
          <div>
            <Label>Role</Label>
            <input autoFocus value={baseRole} onChange={(e) => setBaseRole(e.target.value)}
              placeholder="heading" className={`${inputCls} font-mono`} />
          </div>
          <div>
            <Label>Font family</Label>
            <select value={baseFontId} onChange={(e) => setBaseFontId(e.target.value)} className={inputCls}>
              <option value="">None (set later)</option>
              {fonts.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <>
          <div>
            <Label>Name</Label>
            <input autoFocus value={stylePath} onChange={(e) => setStylePath(e.target.value)}
              placeholder="heading.lg" className={`${inputCls} font-mono`} />
          </div>
          <div>
            <Label>Inherits from</Label>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputCls}>
              <option value="">No base style</option>
              {bases.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Font size (rem)</Label>
            <input value={sizeRem} onChange={(e) => setSizeRem(e.target.value)}
              placeholder="1" inputMode="decimal" className={`${inputCls} font-mono`} />
          </div>
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
