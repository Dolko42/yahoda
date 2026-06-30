"use client";

import type { DesignSystem } from "@yahoda/core";
import { loadPersisted, savePersisted } from "./persist";
import { isSupabaseConfigured } from "./supabase/client";
import { loadFromCloud, saveToCloud } from "./supabase/repository";

/**
 * Unified persistence. Local IndexedDB is always written (instant + offline cache); when a
 * Supabase backend is configured and the user is signed in, the working set is also mirrored
 * to the cloud (debounced). Cloud is the source of truth on load; local is the fallback.
 */

export async function loadWorkspace(): Promise<DesignSystem | null> {
  if (isSupabaseConfigured()) {
    try {
      const cloud = await loadFromCloud();
      if (cloud) return cloud;
    } catch (e) {
      console.warn("[yahoda] cloud load failed — using local copy", e);
    }
  }
  return loadPersisted();
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export function saveWorkspace(ds: DesignSystem): void {
  void savePersisted(ds); // always keep the local cache current
  if (!isSupabaseConfigured()) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveToCloud(ds).catch((e) =>
      console.warn("[yahoda] cloud save failed — changes are kept locally", e),
    );
  }, 800);
}

/** Push the current working set to the cloud immediately (e.g. right after sign-in). */
export async function pushToCloud(ds: DesignSystem): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await saveToCloud(ds);
}
