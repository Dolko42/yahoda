"use client";

import { create } from "zustand";
import {
  type Component,
  type DesignSystem,
  type DocNode,
  type NodeKind,
  type Pattern,
  type Token,
  type TokenValue,
  commit,
  createSeedDesignSystem,
  removeToken as coreRemoveToken,
  resolveTokenValue,
  revertToPublished,
  updateComponent as coreUpdateComponent,
  updateDoc as coreUpdateDoc,
  updatePattern as coreUpdatePattern,
  updateToken as coreUpdateToken,
} from "@yahoda/core";
import { savePersisted } from "@/lib/persist";

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

interface WorkspaceState {
  /** Origin baseline (the seed) — the reference for "dirty" before the first publish. */
  baseline: DesignSystem;
  /** Working set — published snapshot + uncommitted draft edits. Previews render from this. */
  ds: DesignSystem;
  selection: Selection | null;
  tab: InspectorTab;
  canvasView: "preview" | "graph";
  hydrated: boolean;

  select: (sel: Selection) => void;
  setTab: (tab: InspectorTab) => void;
  setCanvasView: (view: "preview" | "graph") => void;
  hydrate: (ds: DesignSystem) => void;

  // --- editing (draft) ---
  patchToken: (id: string, patch: Partial<Omit<Token, "id" | "meta">>) => void;
  patchTokenValue: (id: string, value: TokenValue) => void;
  patchComponent: (id: string, patch: Partial<Omit<Component, "id" | "meta">>) => void;
  patchPattern: (id: string, patch: Partial<Omit<Pattern, "id" | "meta">>) => void;
  patchDoc: (id: string, patch: Partial<Omit<DocNode, "id" | "meta">>) => void;
  deleteToken: (id: string) => void;

  // --- versioning ---
  publish: (message: string) => void;
  discardDraft: () => void;
}

// Start the workspace from a published v1 (the seed committed), so the "dirty" delta
// and the publish summary agree. Fixed id/timestamp keep init deterministic (no SSR drift).
const SEED_COMMIT = { id: "c_seed", now: "2026-01-01T00:00:00.000Z" } as const;
const initialSeed = () => commit(createSeedDesignSystem(), "Initial seed import", SEED_COMMIT);

const save = (ds: DesignSystem) => void savePersisted(ds);

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

    select: (selection) => set({ selection }),
    setTab: (tab) => set({ tab }),
    setCanvasView: (canvasView) => set({ canvasView }),
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

    deleteToken: (id) =>
      set((s) => {
        const ds = coreRemoveToken(s.ds, id);
        save(ds);
        return {
          ds,
          selection:
            s.selection?.kind === "token" && s.selection.id === id ? null : s.selection,
        };
      }),

    publish: (message) => set((s) => apply(commit(s.ds, message))),

    discardDraft: () =>
      set((s) =>
        apply(s.ds.published ? revertToPublished(s.ds) : createSeedDesignSystem()),
      ),
  };
});
