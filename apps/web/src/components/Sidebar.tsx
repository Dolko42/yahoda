"use client";

import { useMemo, useState } from "react";
import { useWorkspace } from "@/store/workspace";
import { buildTree, type TreeItem } from "@/lib/tree";

export function Sidebar() {
  const ds = useWorkspace((s) => s.ds);
  const selection = useWorkspace((s) => s.selection);
  const select = useWorkspace((s) => s.select);
  const [query, setQuery] = useState("");

  const tree = useMemo(() => buildTree(ds), [ds]);

  const q = query.trim().toLowerCase();
  const matches = (item: TreeItem) => !q || item.label.toLowerCase().includes(q);
  const anyMatches = tree.some((s) => s.groups.some((g) => g.items.some(matches)));

  return (
    <nav className="flex w-64 shrink-0 flex-col border-r border-line bg-surface">
      <div className="p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full rounded-lg border border-line bg-page px-3 py-1.5 text-[13px] text-strong outline-none placeholder:text-faint focus:border-primary"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {!anyMatches && (
          <div className="px-2 py-6 text-[13px] text-faint">No matches for “{query.trim()}”.</div>
        )}
        {tree.map((section) => {
          const groups = section.groups
            .map((g) => ({ ...g, items: g.items.filter(matches) }))
            .filter((g) => g.items.length > 0);
          if (groups.length === 0) return null;

          return (
            <div key={section.label} className="mb-4">
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
                {section.label}
              </div>
              {groups.map((group) => (
                <div key={group.label} className="mb-1">
                  {group.label !== section.label && (
                    <div className="px-2 py-1 text-[11px] font-medium text-muted">
                      {group.label}
                    </div>
                  )}
                  <ul>
                    {group.items.map((item) => {
                      const active =
                        selection?.kind === item.kind && selection?.id === item.id;
                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => select({ kind: item.kind, id: item.id })}
                            aria-current={active ? "true" : undefined}
                            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] ${
                              active
                                ? "bg-primary text-white"
                                : "text-strong hover:bg-page"
                            }`}
                          >
                            <span className="truncate">{item.label}</span>
                            {item.sub && (
                              <span
                                className={`ml-2 shrink-0 text-[10px] uppercase tracking-wide ${
                                  active ? "text-white/70" : "text-faint"
                                }`}
                              >
                                {item.sub}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
