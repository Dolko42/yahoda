"use client";

import { useEffect } from "react";
import { useWorkspace } from "@/store/workspace";
import { loadWorkspace, pushToCloud } from "@/lib/workspaceRepo";
import { loadFromCloud } from "@/lib/supabase/repository";
import { getSupabase } from "@/lib/supabase/client";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { Canvas } from "./Canvas";
import { Inspector } from "./Inspector";

export function Workspace() {
  const hydrate = useWorkspace((s) => s.hydrate);

  // Hydrate from the cloud (if signed in) or IndexedDB on mount (client-only; no SSR drift).
  useEffect(() => {
    let active = true;
    loadWorkspace().then((ds) => {
      if (active && ds) hydrate(ds);
    });
    return () => {
      active = false;
    };
  }, [hydrate]);

  // On sign-in/out, reload from the cloud; seed the cloud from local on first sign-in.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN") {
        // Check the cloud directly (not loadWorkspace, which masks an empty cloud with the
        // local copy) so a brand-new account is seeded from the current working set.
        try {
          const cloud = await loadFromCloud();
          if (cloud) hydrate(cloud);
          else await pushToCloud(useWorkspace.getState().ds);
        } catch (e) {
          console.warn("[yahoda] cloud sync on sign-in failed — keeping local copy", e);
        }
      }
    });
    return () => data.subscription.unsubscribe();
  }, [hydrate]);

  return (
    <div className="flex h-full flex-col">
      <Navbar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 p-3">
          <Canvas />
        </main>
        <Inspector />
      </div>
    </div>
  );
}
