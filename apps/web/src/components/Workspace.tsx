"use client";

import { useEffect } from "react";
import { useWorkspace } from "@/store/workspace";
import { loadPersisted } from "@/lib/persist";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { Canvas } from "./Canvas";
import { Inspector } from "./Inspector";

export function Workspace() {
  const hydrate = useWorkspace((s) => s.hydrate);

  // Hydrate from IndexedDB once on mount (client-only; no SSR mismatch).
  useEffect(() => {
    let active = true;
    loadPersisted().then((ds) => {
      if (active && ds) hydrate(ds);
    });
    return () => {
      active = false;
    };
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
