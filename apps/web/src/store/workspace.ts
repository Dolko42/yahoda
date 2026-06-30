"use client";

import { create } from "zustand";
import {
  type BindingScope,
  type Component,
  type DesignSystem,
  type DocNode,
  type NodeKind,
  type Pattern,
  type Token,
  type TokenValue,
  addToken as coreAddToken,
  commit,
  createSeedDesignSystem,
  deleteTokenSafely,
  removeBinding as recipeRemoveBinding,
  resetOverride as recipeResetOverride,
  resolveTokenValue,
  revertToPublished,
  setBinding as recipeSetBinding,
  updateComponent as coreUpdateComponent,
  updateDoc as coreUpdateDoc,
  updatePattern as coreUpdatePattern,
  updateToken as coreUpdateToken,
} from "@yahoda/core";
import { saveWorkspace } from "@/lib/workspaceRepo";

export interface Selection {
  kind: NodeKind;
  id: string;
}

export type InspectorTab =
  | "properties"
  | "dependencies"
  | "code"
  | "ai"
  | "accessibility"
  | "documentation"
  | "version";

/** Which variant/state the recipe editor is currently scoped to. */
export interface RecipeScope {
  variant?: string;
  state?: string;
}

interface WorkspaceState {
  /** Origin baseline (the seed) — the reference for "dirty" before the first publish. */
  baseline: DesignSystem;
  /** Working set — published snapshot + uncommitted draft edits. Previews render from this. */
  ds: DesignSystem;
  selection: Selection | null;
  tab: InspectorTab;
  canvasView: "preview" | "graph";
  hydrated: boolean;
  /** Recipe editor scope for the selected component. */
  recipeScope: RecipeScope;

  select: (sel: Selection) => void;
  setTab: (tab: InspectorTab) => void;
  setCanvasView: (view: "preview" | "graph") => void;
  setRecipeScope: (scope: RecipeScope) => void;
  hydrate: (ds: DesignSystem) => void;

  // --- editing (draft) ---
  patchToken: (id: string, patch: Partial<Omit<Token, "id" | "meta">>) => void;
  patchTokenValue: (id: string, value: TokenValue) => void;
  patchComponent: (id: string, patch: Partial<Omit<Component, "id" | "meta">>) => void;
  patchPattern: (id: string, patch: Partial<Omit<Pattern, "id" | "meta">>) => void;
  patchDoc: (id: string, patch: Partial<Omit<DocNode, "id" | "meta">>) => void;

  // --- token CRUD ---
  createToken: (token: Token) => void;
  /** Safe delete: if `reassignTo` is given, move references there first. */
  removeTokenSafely: (id: string, reassignTo?: string) => void;

  // --- component recipe (property → token) ---
  setComponentProperty: (
    componentId: string,
    property: string,
    tokenId: string,
    scope?: BindingScope,
  ) => void;
  clearComponentProperty: (componentId: string, property: string, scope?: BindingScope) => void;
  resetComponentOverride: (componentId: string, property: string, scope: BindingScope) => void;

  // --- versioning ---
  publish: (message: string) => void;
  discardDraft: () => void;
}

// Start the workspace from a published v1 (the seed committed), so the "dirty" delta
// and the publish summary agree. Fixed id/timestamp keep init deterministic (no SSR drift).
const SEED_COMMIT = { id: "c_seed", now: "2026-01-01T00:00:00.000Z" } as const;
const initialSeed = () => commit(createSeedDesignSystem(), "Initial seed import", SEED_COMMIT);

const save = (ds: DesignSystem) => saveWorkspace(ds);

export const useWorkspace = create<WorkspaceState>((set) => {
  /** Persist a new working set and return the state patch. */
  const apply = (ds: DesignSystem) => {
    save(ds);
    return { ds };
  };

  return {
    baseline: initialSeed(),
    ds: initialSeed(),
    selection: { kind: "token", id: "t.color.primary" },
    tab: "properties",
    canvasView: "preview",
    hydrated: false,
    recipeScope: {},

    select: (selection) => set({ selection, recipeScope: {} }),
    setTab: (tab) => set({ tab }),
    setCanvasView: (canvasView) => set({ canvasView }),
    setRecipeScope: (recipeScope) => set({ recipeScope }),
    hydrate: (ds) => set({ ds, hydrated: true }),

    patchToken: (id, patch) => set((s) => apply(coreUpdateToken(s.ds, id, patch))),
    patchTokenValue: (id, value) =>
      set((s) => {
        const resolved = resolveTokenValue(s.ds, id);
        const targetId = resolved.ok ? resolved.token.id : id;
        return apply(coreUpdateToken(s.ds, targetId, { value }));
      }),
    patchComponent: (id, patch) => set((s) => apply(coreUpdateComponent(s.ds, id, patch))),
    patchPattern: (id, patch) => set((s) => apply(coreUpdatePattern(s.ds, id, patch))),
    patchDoc: (id, patch) => set((s) => apply(coreUpdateDoc(s.ds, id, patch))),

    // Add a token without changing selection — callers decide whether to navigate to it
    // (sidebar "+ New" selects it; inline create-and-assign keeps the component selected).
    createToken: (token) => set((s) => apply(coreAddToken(s.ds, token))),

    removeTokenSafely: (id, reassignTo) =>
      set((s) => {
        const ds = deleteTokenSafely(s.ds, id, reassignTo ? { reassignTo } : {});
        save(ds);
        return {
          ds,
          selection:
            s.selection?.kind === "token" && s.selection.id === id ? null : s.selection,
        };
      }),

    setComponentProperty: (componentId, property, tokenId, scope = {}) =>
      set((s) => {
        const c = s.ds.components.find((x) => x.id === componentId);
        if (!c) return {};
        const bindings = recipeSetBinding(c, property, tokenId, scope);
        return apply(coreUpdateComponent(s.ds, componentId, { bindings }));
      }),

    clearComponentProperty: (componentId, property, scope = {}) =>
      set((s) => {
        const c = s.ds.components.find((x) => x.id === componentId);
        if (!c) return {};
        const bindings = recipeRemoveBinding(c, property, scope);
        return apply(coreUpdateComponent(s.ds, componentId, { bindings }));
      }),

    resetComponentOverride: (componentId, property, scope) =>
      set((s) => {
        const c = s.ds.components.find((x) => x.id === componentId);
        if (!c) return {};
        const bindings = recipeResetOverride(c, property, scope);
        return apply(coreUpdateComponent(s.ds, componentId, { bindings }));
      }),

    publish: (message) => set((s) => apply(commit(s.ds, message))),

    discardDraft: () =>
      set((s) =>
        apply(s.ds.published ? revertToPublished(s.ds) : createSeedDesignSystem()),
      ),
  };
});
