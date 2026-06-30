"use client";

import { useMemo } from "react";
import {
  type BindingScope,
  type Component,
  type DesignSystem,
  propertiesFor,
  resolveRecipe,
} from "@yahoda/core";
import { type RecipeScope, useWorkspace } from "@/store/workspace";
import { PropertyTokenPicker } from "./PropertyTokenPicker";

/** A pill button used by the scope switcher. */
function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[12px] ${
        active ? "bg-primary text-white" : "border border-line bg-white text-muted hover:text-strong"
      }`}
    >
      {children}
    </button>
  );
}

const scopeEq = (a: RecipeScope, b: RecipeScope) =>
  (a.variant ?? "") === (b.variant ?? "") && (a.state ?? "") === (b.state ?? "");

/**
 * The component recipe editor. Shows the base recipe and, per variant/state, which token
 * powers each property — with inherited vs overridden state and a reset-to-inherited action.
 * Internally these are token bindings; the UI presents them as "choose the token that powers
 * this property". States and variants store only what they override.
 */
export function RecipeEditor({ ds, component }: { ds: DesignSystem; component: Component }) {
  const scope = useWorkspace((s) => s.recipeScope);
  const setRecipeScope = useWorkspace((s) => s.setRecipeScope);
  const setComponentProperty = useWorkspace((s) => s.setComponentProperty);
  const clearComponentProperty = useWorkspace((s) => s.clearComponentProperty);
  const resetComponentOverride = useWorkspace((s) => s.resetComponentOverride);

  const isBase = !scope.variant && !scope.state;
  const properties = useMemo(() => propertiesFor(component), [component]);
  const entries = useMemo(
    () => resolveRecipe(component, properties.map((p) => p.key), scope),
    [component, properties, scope],
  );
  const entryByKey = new Map(entries.map((e) => [e.property, e]));

  // group property rows by their group label, preserving catalog order
  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, typeof properties>();
    for (const p of properties) {
      if (!map.has(p.group)) {
        map.set(p.group, []);
        order.push(p.group);
      }
      map.get(p.group)!.push(p);
    }
    return order.map((g) => ({ group: g, items: map.get(g)! }));
  }, [properties]);

  const states = component.states.filter((s) => s.name !== "default");

  const selectVariant = (variant?: string) =>
    setRecipeScope({ ...(variant ? { variant } : {}), ...(scope.state ? { state: scope.state } : {}) });
  const selectState = (state?: string) =>
    setRecipeScope({ ...(scope.variant ? { variant: scope.variant } : {}), ...(state ? { state } : {}) });

  return (
    <div className="space-y-4">
      {/* scope switcher */}
      <div className="space-y-2 rounded-lg border border-line bg-page/60 p-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] uppercase tracking-wide text-faint">Variant</span>
          <Pill active={!scope.variant} onClick={() => selectVariant(undefined)}>
            Base
          </Pill>
          {component.variants.map((v) => (
            <Pill key={v.id} active={scope.variant === v.name} onClick={() => selectVariant(v.name)}>
              {v.name}
            </Pill>
          ))}
        </div>
        {states.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] uppercase tracking-wide text-faint">State</span>
            <Pill active={!scope.state} onClick={() => selectState(undefined)}>
              default
            </Pill>
            {states.map((st) => (
              <Pill key={st.id} active={scope.state === st.name} onClick={() => selectState(st.name)}>
                {st.name}
              </Pill>
            ))}
          </div>
        )}
        <div className="text-[11px] text-muted">
          {isBase ? (
            <>Editing the <span className="font-medium text-strong">base recipe</span> — shared by every variant.</>
          ) : (
            <>
              Editing{" "}
              <span className="font-medium text-strong">
                {scope.variant ?? "all variants"}
                {scope.state ? ` · ${scope.state}` : ""}
              </span>
              . Only overrides are stored here; everything else is inherited.
            </>
          )}
        </div>
      </div>

      {/* property rows */}
      {groups.map(({ group, items }) => (
        <div key={group}>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
            {group}
          </div>
          <div className="space-y-2">
            {items.map((p) => {
              const entry = entryByKey.get(p.key)!;
              const overridden = !isBase && entry.isOverride;
              const inherited = !isBase && !entry.isOverride;
              return (
                <div key={p.key} className="grid grid-cols-[96px_1fr] items-start gap-2">
                  <div className="pt-1.5 text-[13px] text-strong">{p.label}</div>
                  <div>
                    <PropertyTokenPicker
                      ds={ds}
                      tokenType={p.tokenType}
                      currentTokenId={entry.tokenId}
                      inherited={inherited}
                      onSelect={(tokenId) =>
                        setComponentProperty(component.id, p.key, tokenId, scope as BindingScope)
                      }
                    />
                    <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                      {overridden && (
                        <button
                          type="button"
                          onClick={() => resetComponentOverride(component.id, p.key, scope as BindingScope)}
                          className="text-primary hover:underline"
                        >
                          Reset to inherited
                        </button>
                      )}
                      {isBase && entry.tokenId && (
                        <button
                          type="button"
                          onClick={() => clearComponentProperty(component.id, p.key, {})}
                          className="text-faint hover:text-red-600"
                        >
                          Clear
                        </button>
                      )}
                      {inherited && entry.tokenId === null && (
                        <span className="text-faint">Not set on the base recipe.</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
