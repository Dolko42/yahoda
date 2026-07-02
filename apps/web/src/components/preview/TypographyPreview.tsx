"use client";

import type { CSSProperties } from "react";
import {
  type DesignSystem,
  type Token,
  getFontFamilyUsages,
  getTypographyChildren,
  getTypographyParent,
  groupTypographyStylesByRole,
  isFontFamilyToken,
  isTypographyBaseToken,
  resolveTypographyToken,
} from "@yahoda/core";
import { useWorkspace } from "@/store/workspace";
import { typographyCss } from "@/lib/style";

/**
 * Typography canvas: a stylesheet specimen, not a lone pangram. A font shows a large
 * sample plus every style it powers; a base style shows the styles inheriting it; a
 * semantic style shows its resolved card emphasized inside the full specimen.
 */

const SAMPLE_BY_ROLE: Record<string, string> = {
  display: "Design once, ship everywhere",
  heading: "A living stylesheet for your product",
  body: "Tokens, components and patterns stay connected, so a change to a base style cascades through every screen that uses it.",
  label: "Save changes",
  link: "Learn more →",
  caption: "Updated 3 minutes ago · 2.4 MB",
  eyebrow: "New feature",
};

const sampleFor = (name: string): string => {
  const role = name.split(".")[1] ?? "";
  return SAMPLE_BY_ROLE[role] ?? "The quick brown fox jumps over the lazy dog";
};

function SummaryChips({ ds, tokenId }: { ds: DesignSystem; tokenId: string }) {
  const { style: s } = resolveTypographyToken(ds, tokenId);
  const family = s.fontFamily.split(",")[0]?.replace(/"/g, "").trim() ?? "";
  const chips: [string, string][] = [
    ["Family", family],
    ["Size", s.fontSize],
    ["Weight", String(s.fontWeight)],
    ["Line height", String(s.lineHeight)],
  ];
  if (s.letterSpacing !== "normal") chips.push(["Tracking", s.letterSpacing]);
  if (s.textTransform !== "none") chips.push(["Transform", s.textTransform]);
  if (s.fontStyle !== "normal") chips.push(["Style", s.fontStyle]);
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(([label, value]) => (
        <span
          key={label}
          className="rounded-md border border-line bg-white px-2 py-1 text-[11px] text-muted"
        >
          {label} <span className="font-mono text-strong">{value}</span>
        </span>
      ))}
    </div>
  );
}

/** One specimen line: style name on top, live sample rendered in the resolved style. */
function SpecimenLine({
  ds,
  token,
  emphasized,
  dimmed,
}: {
  ds: DesignSystem;
  token: Token;
  emphasized?: boolean;
  dimmed?: boolean;
}) {
  const select = useWorkspace((s) => s.select);
  const css: CSSProperties = typographyCss(ds, token.id);
  return (
    <button
      onClick={() => select({ kind: "token", id: token.id })}
      className={`block w-full rounded-lg px-3 py-2 text-left transition-opacity hover:bg-page ${
        emphasized ? "bg-page ring-1 ring-primary" : ""
      } ${dimmed ? "opacity-45 hover:opacity-100" : ""}`}
    >
      <span className="mb-0.5 block font-mono text-[10px] text-faint">
        {token.name.replace(/^typography\./, "")}
      </span>
      <span className="block truncate text-[#181A1D]" style={css}>
        {sampleFor(token.name)}
      </span>
    </button>
  );
}

/** The whole semantic stylesheet, grouped by role; `focusId` gets emphasized. */
function StylesheetSpecimen({ ds, focusId }: { ds: DesignSystem; focusId?: string }) {
  const groups = groupTypographyStylesByRole(ds.tokens);
  if (groups.length === 0) return null;
  return (
    <div className="ds-scope space-y-1 rounded-xl bg-white p-6 shadow-app-1">
      {groups.map((g) => (
        <div key={g.role}>
          {g.tokens.map((t) => (
            <SpecimenLine
              key={t.id}
              ds={ds}
              token={t}
              emphasized={t.id === focusId}
              dimmed={Boolean(focusId) && t.id !== focusId}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

function IssueBanner({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
      ⚠ {issues.join("; ")}
    </div>
  );
}

// --- font family --------------------------------------------------------------

function FontFamilyCanvas({ ds, token }: { ds: DesignSystem; token: Token }) {
  const stack = "fontFamily" in token.value ? token.value.fontFamily : "";
  const usages = getFontFamilyUsages(ds, token.id);
  return (
    <div className="space-y-8">
      <div className="ds-scope rounded-xl bg-white p-8 shadow-app-1">
        <div className="text-[42px] leading-tight text-[#181A1D]" style={{ fontFamily: stack }}>
          Aa Bb Cc 0123
        </div>
        <div
          className="mt-2 text-[16px] text-[#181A1D]/80"
          style={{ fontFamily: stack }}
        >
          The quick brown fox jumps over the lazy dog — 1234567890
        </div>
        <div className="mt-4 font-mono text-[12px] text-faint">{stack}</div>
      </div>

      <Section title={`Styles using this font (${usages.length})`}>
        {usages.length === 0 ? (
          <div className="rounded-lg border border-line bg-white px-4 py-3 text-[12px] text-faint">
            No typography styles use this font yet — bind it from a base style's inspector.
          </div>
        ) : (
          <div className="ds-scope space-y-1 rounded-xl bg-white p-6 shadow-app-1">
            {usages.map((t) => (
              <SpecimenLine key={t.id} ds={ds} token={t} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// --- base style -----------------------------------------------------------------

function BaseStyleCanvas({ ds, token }: { ds: DesignSystem; token: Token }) {
  const resolved = resolveTypographyToken(ds, token.id);
  const children = getTypographyChildren(ds, token.id);
  return (
    <div className="space-y-8">
      <IssueBanner issues={resolved.issues} />
      <div className="ds-scope rounded-xl bg-white p-8 shadow-app-1">
        <div className="text-[28px] text-[#181A1D]" style={typographyCss(ds, token.id)}>
          {sampleFor(token.name)}
        </div>
      </div>
      <SummaryChips ds={ds} tokenId={token.id} />

      <Section title={`Styles inheriting this base (${children.length})`}>
        {children.length === 0 ? (
          <div className="rounded-lg border border-line bg-white px-4 py-3 text-[12px] text-faint">
            Nothing inherits this base yet — point a text style's “Inherits from” at it.
          </div>
        ) : (
          <div className="ds-scope space-y-1 rounded-xl bg-white p-6 shadow-app-1">
            {children.map((t) => (
              <SpecimenLine key={t.id} ds={ds} token={t} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// --- semantic style ----------------------------------------------------------

function SemanticStyleCanvas({ ds, token }: { ds: DesignSystem; token: Token }) {
  const select = useWorkspace((s) => s.select);
  const resolved = resolveTypographyToken(ds, token.id);
  const parent = getTypographyParent(ds, token.id);
  return (
    <div className="space-y-8">
      <IssueBanner issues={resolved.issues} />
      <div className="ds-scope rounded-xl bg-white p-8 shadow-app-1">
        <div className="text-[#181A1D]" style={typographyCss(ds, token.id)}>
          {sampleFor(token.name)}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SummaryChips ds={ds} tokenId={token.id} />
        {parent && (
          <button
            onClick={() => select({ kind: "token", id: parent.id })}
            className="rounded-md border border-line bg-white px-2 py-1 text-[11px] text-muted hover:border-primary"
          >
            Inherits <span className="font-mono text-strong">{parent.name}</span>
          </button>
        )}
      </div>

      <Section title="In the stylesheet">
        <StylesheetSpecimen ds={ds} focusId={token.id} />
      </Section>
    </div>
  );
}

// --- entry ---------------------------------------------------------------------

export function TypographyPreview({ ds, token }: { ds: DesignSystem; token: Token }) {
  if (isFontFamilyToken(token)) return <FontFamilyCanvas ds={ds} token={token} />;
  if (isTypographyBaseToken(token)) return <BaseStyleCanvas ds={ds} token={token} />;
  return <SemanticStyleCanvas ds={ds} token={token} />;
}
