"use client";

import type { Component, DesignSystem } from "@yahoda/core";
import { ComponentElement } from "./ComponentElement";

interface Props {
  ds: DesignSystem;
  component: Component;
}

/** Variants × states matrix preview for a component. */
export function ComponentPreview({ ds, component }: Props) {
  const variants =
    component.variants.length > 0 ? component.variants : [{ id: "_", name: "default" }];
  const states =
    component.states.length > 0 ? component.states : [{ id: "_", name: "default" }];

  return (
    <div className="space-y-6">
      {variants.map((variant) => (
        <section key={variant.id}>
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted">
            {variant.name}
          </h3>
          <div className="ds-scope flex flex-wrap items-start gap-6 rounded-xl bg-white p-6 shadow-app-1">
            {states.map((state) => (
              <div key={state.id} className="flex flex-col items-start gap-2">
                <ComponentElement
                  ds={ds}
                  component={component}
                  scope={{
                    variant: variant.name,
                    ...(state.name !== "default" ? { state: state.name } : {}),
                  }}
                />
                <span className="text-[11px] text-faint">{state.name}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
