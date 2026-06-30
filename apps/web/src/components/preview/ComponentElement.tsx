"use client";

import type { CSSProperties } from "react";
import type { Component, DesignSystem, ResolveScope } from "@yahoda/core";
import { componentStyle } from "@/lib/style";

interface Props {
  ds: DesignSystem;
  component: Component;
  scope?: ResolveScope;
}

/** Renders a representative live element for a component using its resolved tokens. */
export function ComponentElement({ ds, component, scope = {} }: Props) {
  const { style, unresolved } = componentStyle(ds, component, scope);

  if (unresolved.length > 0) {
    return (
      <div className="rounded-md border border-dashed border-red-400 bg-red-50 px-3 py-2 text-[12px] text-red-700">
        Unresolved: {unresolved.join(", ")}
      </div>
    );
  }

  const stateTweaks: CSSProperties = {};
  if (scope.state === "disabled") {
    stateTweaks.opacity = 0.45;
    stateTweaks.cursor = "not-allowed";
  }
  if (scope.state === "focus") {
    stateTweaks.outline = "2px solid #2448B8";
    stateTweaks.outlineOffset = "2px";
  }

  const s = { ...style, ...stateTweaks };

  switch (component.name) {
    case "Button":
      return (
        <button style={{ border: "none", fontWeight: 600, cursor: "pointer", ...s }}>
          Button
        </button>
      );
    case "Badge":
      return (
        <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, ...s }}>
          Badge
        </span>
      );
    case "Input":
      return (
        <input
          readOnly
          value=""
          placeholder="you@example.com"
          style={{ minWidth: 220, ...s }}
        />
      );
    case "Card":
      return (
        <div style={{ minWidth: 220, minHeight: 96, ...s }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Card title</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Grouped content lives here.</div>
        </div>
      );
    case "Alert":
      return (
        <div style={{ minWidth: 260, fontSize: 13, ...s }}>
          <strong>Heads up.</strong> Something needs your attention.
        </div>
      );
    case "Dialog":
      return (
        <div style={{ maxWidth: 320, ...s }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Confirm action</div>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 16 }}>
            This cannot be undone. Are you sure?
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#2448B8" }}>Confirm · Cancel</div>
        </div>
      );
    default:
      return <div style={s}>{component.name}</div>;
  }
}
