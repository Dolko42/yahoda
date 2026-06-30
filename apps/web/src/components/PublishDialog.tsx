"use client";

import { useMemo, useState } from "react";
import { type NodeDiff, findStaleRules, publishSummary } from "@yahoda/core";
import { useWorkspace } from "@/store/workspace";
import { labelFor } from "@/lib/nodes";
import { useEscape } from "@/lib/useEscape";

function KindLine({ label, nd }: { label: string; nd: NodeDiff<unknown> }) {
  const a = nd.added.length;
  const u = nd.updated.length;
  const r = nd.removed.length;
  if (a + u + r === 0) return null;
  return (
    <div className="flex items-center gap-3 text-[12px]">
      <span className="w-24 text-muted">{label}</span>
      {a > 0 && <span className="text-green-600">+{a} added</span>}
      {u > 0 && <span className="text-primary">~{u} changed</span>}
      {r > 0 && <span className="text-red-600">−{r} removed</span>}
    </div>
  );
}

export function PublishDialog({ onClose }: { onClose: () => void }) {
  const ds = useWorkspace((s) => s.ds);
  const publish = useWorkspace((s) => s.publish);
  const [message, setMessage] = useState("");

  useEscape(onClose);
  const summary = useMemo(() => publishSummary(ds), [ds]);
  const staleRules = useMemo(() => findStaleRules(ds), [ds]);
  const { diff, affected, validation, totalChanges } = summary;

  const affectedCount =
    affected.tokens.length + affected.components.length + affected.patterns.length;
  const canPublish = totalChanges > 0 && validation.ok && message.trim().length > 0;

  const affectedNames = [
    ...affected.tokens.map((id) => labelFor(ds, "token", id)),
    ...affected.components.map((id) => labelFor(ds, "component", id)),
    ...affected.patterns.map((id) => labelFor(ds, "pattern", id)),
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Publish changes"
        className="flex max-h-[80vh] w-[520px] flex-col overflow-hidden rounded-2xl bg-page shadow-app-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold text-strong">Publish changes</h2>
          <p className="text-[12px] text-muted">
            {ds.published ? "Commit your draft as a new version." : "Create the first published version."}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
              {totalChanges} change{totalChanges === 1 ? "" : "s"}
            </div>
            <div className="space-y-1">
              <KindLine label="Tokens" nd={diff.tokens} />
              <KindLine label="Components" nd={diff.components} />
              <KindLine label="Patterns" nd={diff.patterns} />
              <KindLine label="Docs" nd={diff.docs} />
              {totalChanges === 0 && <div className="text-[12px] text-faint">Nothing to publish.</div>}
            </div>
          </section>

          {affectedCount > 0 && (
            <section>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
                Affected (incl. blast radius): {affectedCount}
              </div>
              <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                {affectedNames.map((name, i) => (
                  <span key={i} className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-muted">
                    {name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {validation.errors.length > 0 && (
            <section>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-red-700">
                {validation.errors.length} error(s) — must fix before publishing
              </div>
              <ul className="space-y-0.5">
                {validation.errors.map((e, i) => (
                  <li key={i} className="text-[12px] text-red-700">[{e.code}] {e.message}</li>
                ))}
              </ul>
            </section>
          )}

          {staleRules.length > 0 && (
            <section>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                {staleRules.length} AI rule(s) may be stale
              </div>
              <ul className="space-y-0.5">
                {staleRules.map((s) => (
                  <li key={s.ownerId} className="text-[12px] text-amber-700">
                    {s.ownerName} — linked {s.changedNames.join(", ")} changed
                  </li>
                ))}
              </ul>
            </section>
          )}

          {validation.warnings.length > 0 && (
            <section>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                {validation.warnings.length} warning(s)
              </div>
              <ul className="space-y-0.5">
                {validation.warnings.map((w, i) => (
                  <li key={i} className="text-[12px] text-amber-700">[{w.code}] {w.message}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-faint">
              Commit message
            </label>
            <input
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what changed…"
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-strong outline-none focus:border-primary"
            />
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-line bg-page px-3 py-1.5 text-[13px] text-muted hover:text-strong"
          >
            Cancel
          </button>
          <button
            disabled={!canPublish}
            onClick={() => {
              publish(message.trim());
              onClose();
            }}
            className="rounded-lg bg-primary px-3.5 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}
