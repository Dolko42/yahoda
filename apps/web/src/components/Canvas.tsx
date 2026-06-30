"use client";

import { useWorkspace } from "@/store/workspace";
import { resolveSelection } from "@/lib/nodes";
import { kindLabel } from "@/lib/format";
import { TokenPreview } from "./preview/TokenPreview";
import { ComponentPreview } from "./preview/ComponentPreview";
import { PatternPreview } from "./preview/PatternPreview";
import { GraphView } from "./GraphView";

function ViewToggle() {
  const view = useWorkspace((s) => s.canvasView);
  const setView = useWorkspace((s) => s.setCanvasView);
  const opts = [
    { id: "preview", label: "Preview" },
    { id: "graph", label: "Graph" },
  ] as const;
  return (
    <div className="flex rounded-full bg-page p-0.5" role="tablist" aria-label="Canvas view">
      {opts.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={view === o.id}
          onClick={() => setView(o.id)}
          className={`rounded-full px-3 py-1 text-[12px] ${
            view === o.id ? "bg-surface font-medium text-strong shadow-app-1" : "text-muted hover:text-strong"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Canvas() {
  const ds = useWorkspace((s) => s.ds);
  const selection = useWorkspace((s) => s.selection);
  const view = useWorkspace((s) => s.canvasView);
  const resolved = resolveSelection(ds, selection);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-canvas bg-canvas shadow-inner">
      {resolved ? (
        <>
          <div className="flex items-center gap-3 px-7 pt-6">
            <span className="rounded-full bg-page px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              {kindLabel(resolved.kind)}
            </span>
            <h2 className="text-[18px] font-semibold tracking-tight text-strong">
              {resolved.kind === "doc" ? resolved.node.title : resolved.node.name}
            </h2>
            <div className="ml-auto">
              <ViewToggle />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-10 pt-6">
            {view === "graph" ? (
              <GraphView ds={ds} sel={resolved} />
            ) : (
              <>
                {resolved.kind === "token" && <TokenPreview ds={ds} token={resolved.node} />}
                {resolved.kind === "component" && <ComponentPreview ds={ds} component={resolved.node} />}
                {resolved.kind === "pattern" && <PatternPreview ds={ds} pattern={resolved.node} />}
                {resolved.kind === "doc" && (
                  <article className="max-w-2xl whitespace-pre-wrap rounded-xl bg-white p-8 font-mono text-[13px] leading-relaxed text-strong shadow-app-1">
                    {resolved.node.body}
                  </article>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <div className="grid h-full place-items-center px-6 text-center">
          <div>
            <div className="text-[14px] font-medium text-muted">Nothing selected</div>
            <div className="mt-1 text-[13px] text-faint">
              Pick a token, component, or pattern from the sidebar to preview it.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
