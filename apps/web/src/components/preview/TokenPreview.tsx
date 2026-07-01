"use client";

import {
  type DesignSystem,
  type Token,
  type TokenValue,
  contrastRatio,
  fluidToCss,
  getDependents,
  isFluidValue,
  resolveColor,
  resolveTokenValue,
} from "@yahoda/core";
import { findComponent } from "@/lib/nodes";
import { formatTokenValue } from "@/lib/format";
import { ComponentElement } from "./ComponentElement";

const PANGRAM = "The quick brown fox jumps over the lazy dog";

/** A CSS font-size string from a resolved size value (fixed dimension or fluid clamp). */
function cssSize(v: TokenValue, fallback = "1rem"): string {
  if (isFluidValue(v)) return fluidToCss(v.fluid);
  if ("dimension" in v) return `${v.dimension}${v.unit}`;
  return fallback;
}

function ContrastBadge({ fg, bg, label }: { fg: string; bg: string; label: string }) {
  const ratio = contrastRatio(fg, bg);
  const pass = ratio !== null && ratio >= 4.5;
  return (
    <div className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2">
      <span
        className="grid h-8 w-8 place-items-center rounded text-[12px] font-bold"
        style={{ background: bg, color: fg }}
      >
        Aa
      </span>
      <div className="text-[12px]">
        <div className="font-medium text-strong">{label}</div>
        <div className={pass ? "text-green-600" : "text-red-600"}>
          {ratio ? ratio.toFixed(2) : "—"}:1 {pass ? "AA✓" : "AA✗"}
        </div>
      </div>
    </div>
  );
}

function UsedByComponents({ ds, tokenId }: { ds: DesignSystem; tokenId: string }) {
  const consumers = getDependents(ds, tokenId)
    .filter((r) => r.kind === "component")
    .map((r) => findComponent(ds, r.id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (consumers.length === 0) return null;
  return (
    <section>
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted">
        Used by {consumers.length} component{consumers.length === 1 ? "" : "s"}
      </h3>
      <div className="ds-scope flex flex-wrap items-start gap-6 rounded-xl bg-white p-6 shadow-app-1">
        {consumers.map((c) => (
          <div key={c.id} className="flex flex-col items-start gap-2">
            <ComponentElement ds={ds} component={c} />
            <span className="text-[11px] text-faint">{c.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TokenPreview({ ds, token }: { ds: DesignSystem; token: Token }) {
  const resolved = resolveTokenValue(ds, token.id);
  const value = resolved.ok ? resolved.value : token.value;

  // ---- color ----
  if (token.type === "color") {
    const hex = resolveColor(ds, token.id) ?? "#000000";
    return (
      <div className="space-y-8">
        <div className="flex items-end gap-5">
          <div
            className="h-28 w-40 rounded-xl border border-line shadow-app-1"
            style={{ background: hex }}
          />
          <div>
            <div className="font-mono text-[15px] text-strong">{hex}</div>
            {resolved.ok && resolved.aliasChain.length > 1 && (
              <div className="mt-1 font-mono text-[12px] text-faint">
                {resolved.aliasChain
                  .map((id) => ds.tokens.find((t) => t.id === id)?.name ?? id)
                  .join(" → ")}
              </div>
            )}
          </div>
        </div>

        <section>
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted">
            Contrast
          </h3>
          <div className="flex flex-wrap gap-3">
            <ContrastBadge fg="#FFFFFF" bg={hex} label="White text" />
            <ContrastBadge fg="#181A1D" bg={hex} label="Dark text" />
            <ContrastBadge fg={hex} bg="#FFFFFF" label="On white" />
          </div>
        </section>

        <UsedByComponents ds={ds} tokenId={token.id} />
      </div>
    );
  }

  // ---- font family ----
  if (token.type === "fontFamily" && "fontFamily" in value) {
    const stack = value.fontFamily;
    return (
      <div className="space-y-8">
        <div className="font-mono text-[13px] text-faint">{stack}</div>
        <div className="ds-scope space-y-4 rounded-xl bg-white p-8 shadow-app-1" style={{ fontFamily: stack }}>
          <div style={{ fontSize: "2.25rem", fontWeight: 700 }}>{PANGRAM}</div>
          {([400, 500, 600, 700] as const).map((w) => (
            <div key={w} className="flex items-baseline gap-4">
              <span className="w-10 shrink-0 font-mono text-[11px] text-faint">{w}</span>
              <span style={{ fontWeight: w, fontSize: "1.125rem" }}>{PANGRAM}</span>
            </div>
          ))}
        </div>
        <UsedByComponents ds={ds} tokenId={token.id} />
      </div>
    );
  }

  // ---- font size (fixed or fluid) ----
  if (token.type === "dimension" && token.name.startsWith("fontSize")) {
    const size = cssSize(value);
    const fluid = isFluidValue(value);
    return (
      <div className="space-y-8">
        <div className="font-mono text-[13px] text-strong">{size}</div>
        <div className="ds-scope rounded-xl bg-white p-8 shadow-app-1">
          <div style={{ fontSize: size, lineHeight: 1.2, fontWeight: 600 }}>Ag {token.name}</div>
          {fluid && (
            <div className="mt-3 text-[12px] text-faint">
              Scales with the viewport — resize the window to see it change.
            </div>
          )}
        </div>
        <UsedByComponents ds={ds} tokenId={token.id} />
      </div>
    );
  }

  // ---- dimension (radius / spacing) ----
  if (token.type === "dimension" && "dimension" in value) {
    const px = `${value.dimension}${value.unit}`;
    const isRadius = token.name.startsWith("radius");
    return (
      <div className="space-y-8">
        <div className="font-mono text-[15px] text-strong">{px}</div>
        {isRadius ? (
          <div className="ds-scope flex items-end gap-6 rounded-xl bg-white p-8 shadow-app-1">
            {[80, 120, 160].map((w) => (
              <div
                key={w}
                className="border border-[#C4C9D1] bg-[#E3E6EA]"
                style={{ width: w, height: 72, borderRadius: px }}
              />
            ))}
          </div>
        ) : (
          <div className="ds-scope rounded-xl bg-white p-8 shadow-app-1">
            <div className="flex items-center" style={{ gap: px }}>
              <div className="h-16 w-16 rounded bg-[#2448B8]" />
              <div className="h-16 w-16 rounded bg-[#2448B8]" />
              <div className="h-16 w-16 rounded bg-[#2448B8]" />
            </div>
            <div className="mt-3 text-[12px] text-faint">gap: {px}</div>
          </div>
        )}
        <UsedByComponents ds={ds} tokenId={token.id} />
      </div>
    );
  }

  // ---- typography ----
  if (token.type === "typography" && "typography" in value) {
    const t = value.typography;
    const size = cssSize(t.fontSize);
    const family = typeof t.fontFamily === "string" ? t.fontFamily : undefined;
    return (
      <div className="space-y-8">
        <div className="font-mono text-[13px] text-faint">{formatTokenValue(value)}</div>
        <div className="ds-scope rounded-xl bg-white p-8 shadow-app-1">
          <div
            style={{
              fontFamily: family,
              fontSize: size,
              lineHeight: t.lineHeight,
              fontWeight: t.fontWeight,
              ...(t.letterSpacing ? { letterSpacing: `${t.letterSpacing.dimension}${t.letterSpacing.unit}` } : {}),
            }}
          >
            {PANGRAM}
          </div>
        </div>
        <UsedByComponents ds={ds} tokenId={token.id} />
      </div>
    );
  }

  // ---- shadow / elevation ----
  if (token.type === "shadow") {
    const css = formatTokenValue(value);
    return (
      <div className="space-y-8">
        <div className="font-mono text-[12px] text-faint">{css}</div>
        <div className="ds-scope rounded-xl bg-white p-12 shadow-app-1">
          <div
            className="h-24 w-40 rounded-lg bg-white"
            style={{ boxShadow: css.replace(/→\S+/g, "rgba(0,0,0,0.12)") }}
          />
        </div>
        <UsedByComponents ds={ds} tokenId={token.id} />
      </div>
    );
  }

  // ---- motion (duration / easing) ----
  if (token.type === "duration" || token.type === "easing") {
    const dur =
      token.type === "duration" && "duration" in value
        ? `${value.duration}${value.unit}`
        : "600ms";
    const ease =
      token.type === "easing" && "easing" in value
        ? Array.isArray(value.easing)
          ? `cubic-bezier(${value.easing.join(",")})`
          : value.easing
        : "ease";
    return (
      <div className="space-y-8">
        <div className="font-mono text-[13px] text-strong">{formatTokenValue(value)}</div>
        <div className="ds-scope rounded-xl bg-white p-8 shadow-app-1">
          <div
            className="h-10 w-10 rounded-full bg-[#2448B8]"
            style={{ animation: `ds-slide ${dur} ${ease} infinite alternate` }}
          />
          <div className="mt-3 text-[12px] text-faint">
            animation: {dur} {ease}
          </div>
        </div>
      </div>
    );
  }

  // ---- fallback ----
  return (
    <div className="ds-scope rounded-xl bg-white p-8 shadow-app-1">
      <div className="font-mono text-[14px] text-strong">{formatTokenValue(value)}</div>
    </div>
  );
}
