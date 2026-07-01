"use client";

import { useWorkspace } from "@/store/workspace";
import { CATEGORIES } from "@/lib/categories";

/**
 * Inline section navigation for the workspace — a horizontal tab bar above the canvas.
 * Switching a tab sets the active category in the store, which drives the sidebar's
 * content (search + grouped items + "+ New"). Underline active state, neutral chrome.
 */
export function SectionTabs() {
  const category = useWorkspace((s) => s.category);
  const setCategory = useWorkspace((s) => s.setCategory);

  return (
    <nav
      role="tablist"
      aria-label="System sections"
      className="flex shrink-0 items-center gap-1 border-b border-line bg-surface px-4"
    >
      {CATEGORIES.map((c) => {
        const active = category === c.id;
        return (
          <button
            key={c.id}
            role="tab"
            aria-selected={active}
            onClick={() => setCategory(c.id)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-[13px] transition-colors ${
              active
                ? "border-primary font-medium text-strong"
                : "border-transparent text-muted hover:text-strong"
            }`}
          >
            {c.label}
          </button>
        );
      })}
    </nav>
  );
}
