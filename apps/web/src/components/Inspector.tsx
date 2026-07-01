"use client";

import type { ReactNode } from "react";
import {
  type DesignSystem,
  type NodeRef,
  checkTargetSize,
  evaluateComponentContrast,
  getDependencies,
  getDependents,
  resolveColor,
  staleRulesFor,
} from "@yahoda/core";
import { type InspectorTab, useWorkspace } from "@/store/workspace";
import { type ResolvedNode, labelFor, resolveSelection } from "@/lib/nodes";
import { kindLabel } from "@/lib/format";
import { countChanges } from "@/lib/diff";
import { generateComponentCode, generateTokenCode } from "@/lib/code";
import { EditRow, NumberField, SelectField, TextArea, TextField } from "./edit/Controls";
import { TokenValueEditor } from "./edit/TokenValueEditor";
import { ColorTokenExtras } from "./edit/ColorTokenExtras";
import { AiRulesEditor } from "./edit/AiRulesEditor";
import { DeleteTokenButton } from "./edit/DeleteTokenButton";
import { RecipeEditor } from "./edit/RecipeEditor";

const TABS: { id: InspectorTab; label: string }[] = [
  { id: "properties", label: "Properties" },
  { id: "dependencies", label: "Dependencies" },
  { id: "code", label: "Code" },
  { id: "ai", label: "AI Rules" },
  { id: "accessibility", label: "A11y" },
  { id: "documentation", label: "Docs" },
  { id: "version", label: "Version" },
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-line/60 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-faint">{label}</div>
      <div className="mt-0.5 text-[13px] text-strong">{children}</div>
    </div>
  );
}

const Mono = ({ children }: { children: ReactNode }) => (
  <span className="font-mono text-[12px]">{children}</span>
);

function Empty({ children }: { children: ReactNode }) {
  return <div className="py-6 text-[13px] text-faint">{children}</div>;
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto whitespace-pre rounded-lg bg-[#181A1D] p-3 font-mono text-[12px] leading-relaxed text-[#E3E6EA]">
      {code}
    </pre>
  );
}

function RefList({ ds, refs }: { ds: DesignSystem; refs: NodeRef[] }) {
  const select = useWorkspace((s) => s.select);
  if (refs.length === 0) return <Empty>None</Empty>;
  return (
    <ul className="space-y-1 py-1">
      {refs.map((r) => (
        <li key={r.id}>
          <button
            onClick={() => select({ kind: r.kind, id: r.id })}
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] text-strong hover:bg-page"
          >
            <span className="truncate">{labelFor(ds, r.kind, r.id)}</span>
            <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wide text-faint">
              {kindLabel(r.kind)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// --- tabs ------------------------------------------------------------------

function PropertiesTab({ ds, sel }: { ds: DesignSystem; sel: ResolvedNode }) {
  const patchToken = useWorkspace((s) => s.patchToken);
  const patchComponent = useWorkspace((s) => s.patchComponent);
  const patchPattern = useWorkspace((s) => s.patchPattern);
  const patchDoc = useWorkspace((s) => s.patchDoc);

  if (sel.kind === "token") {
    const t = sel.node;
    return (
      <div>
        <Field label="Name"><Mono>{t.name}</Mono></Field>
        <Field label="Type">{t.type}</Field>
        <Field label="Tier">{t.tier}</Field>
        {t.group && <Field label="Group">{t.group}</Field>}
        <EditRow label="Value"><TokenValueEditor ds={ds} token={t} /></EditRow>
        {t.type === "color" && <ColorTokenExtras ds={ds} token={t} />}
        <EditRow label="Usage">
          <TextField value={t.usage ?? ""} placeholder="When to use this token…"
            onCommit={(v) => patchToken(t.id, { usage: v })} />
        </EditRow>
        <EditRow label="Description">
          <TextField value={t.description ?? ""} placeholder="Optional description…"
            onCommit={(v) => patchToken(t.id, { description: v })} />
        </EditRow>
        <DeleteTokenButton ds={ds} tokenId={t.id} />
      </div>
    );
  }
  if (sel.kind === "component") {
    const c = sel.node;
    return (
      <div>
        <Field label="Name">{c.name}</Field>
        <EditRow label="Status">
          <SelectField value={c.status} options={["draft", "published", "deprecated"] as const}
            onCommit={(v) => patchComponent(c.id, { status: v })} />
        </EditRow>
        <EditRow label="Intent">
          <TextField value={c.intent ?? ""} placeholder="Why this component exists…"
            onCommit={(v) => patchComponent(c.id, { intent: v })} />
        </EditRow>
        {c.slots && <Field label="Slots">{c.slots.map((s) => s.name).join(", ")}</Field>}
        <div className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
          Recipe
        </div>
        <RecipeEditor ds={ds} component={c} />
      </div>
    );
  }
  if (sel.kind === "pattern") {
    const p = sel.node;
    return (
      <div>
        <Field label="Name">{p.name}</Field>
        <EditRow label="Intent">
          <TextField value={p.intent ?? ""} onCommit={(v) => patchPattern(p.id, { intent: v })} />
        </EditRow>
        <EditRow label="Usage">
          <TextField value={p.usage ?? ""} onCommit={(v) => patchPattern(p.id, { usage: v })} />
        </EditRow>
        <Field label="Composition">{p.composition.length} root node(s)</Field>
      </div>
    );
  }
  const d = sel.node;
  return (
    <div>
      <EditRow label="Title">
        <TextField value={d.title} onCommit={(v) => patchDoc(d.id, { title: v })} />
      </EditRow>
      {d.target && (
        <Field label="Target">
          {d.target.kind}
          {d.target.id ? ` · ${labelFor(ds, d.target.kind as never, d.target.id)}` : ""}
        </Field>
      )}
    </div>
  );
}

function DependenciesTab({ ds, sel }: { ds: DesignSystem; sel: ResolvedNode }) {
  const uses = getDependencies(ds, sel.node.id);
  const usedBy = getDependents(ds, sel.node.id);
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-faint">Uses</div>
        <RefList ds={ds} refs={uses} />
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-faint">Used by</div>
        <RefList ds={ds} refs={usedBy} />
      </div>
    </div>
  );
}

function CodeTab({ ds, sel }: { ds: DesignSystem; sel: ResolvedNode }) {
  if (sel.kind === "component") return <CodeBlock code={generateComponentCode(ds, sel.node)} />;
  if (sel.kind === "token") return <CodeBlock code={generateTokenCode(ds, sel.node)} />;
  return <Empty>Code generation applies to components and tokens.</Empty>;
}

function StaleBanner({ ds, ownerId }: { ds: DesignSystem; ownerId: string }) {
  const stale = staleRulesFor(ds, ownerId);
  if (!stale) return null;
  return (
    <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
      ⚠ Review needed — linked {stale.changedNames.length === 1 ? "node" : "nodes"}{" "}
      <span className="font-mono">{stale.changedNames.join(", ")}</span> changed since publish.
    </div>
  );
}

function AiTab({ ds, sel }: { ds: DesignSystem; sel: ResolvedNode }) {
  const patchComponent = useWorkspace((s) => s.patchComponent);
  const patchPattern = useWorkspace((s) => s.patchPattern);
  if (sel.kind === "component") {
    return (
      <>
        <StaleBanner ds={ds} ownerId={sel.node.id} />
        <AiRulesEditor
          rules={sel.node.aiRules}
          onChange={(aiRules) => patchComponent(sel.node.id, { aiRules })}
        />
      </>
    );
  }
  if (sel.kind === "pattern") {
    return (
      <>
        <StaleBanner ds={ds} ownerId={sel.node.id} />
        <AiRulesEditor
          rules={sel.node.aiRules}
          onChange={(aiRules) => patchPattern(sel.node.id, { aiRules })}
        />
      </>
    );
  }
  return <Empty>AI rules live on components and patterns. This token is consumed by them.</Empty>;
}

function AccessibilityTab({ ds, sel }: { ds: DesignSystem; sel: ResolvedNode }) {
  const patchComponent = useWorkspace((s) => s.patchComponent);

  if (sel.kind === "component") {
    const c = sel.node;
    const results = evaluateComponentContrast(ds, c);
    const size = checkTargetSize(c);
    const a = c.accessibility;
    const setLevel = (ruleId: string, level: "AA" | "AAA") =>
      patchComponent(c.id, {
        accessibility: {
          ...a,
          contrast: a.contrast.map((r) => (r.id === ruleId ? { ...r, level } : r)),
        },
      });
    return (
      <div className="space-y-4 py-1 text-[13px]">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">Contrast</div>
          {results.length === 0 ? (
            <Empty>No contrast rules.</Empty>
          ) : (
            <ul className="space-y-2">
              {results.map((res) => (
                <li key={res.ruleId} className="flex items-center justify-between gap-2">
                  <Mono>
                    {labelFor(ds, "token", res.foregroundTokenId)} / {labelFor(ds, "token", res.backgroundTokenId)}
                  </Mono>
                  <span className="flex items-center gap-2">
                    <span className={res.pass ? "text-green-600" : "text-red-600"}>
                      {res.ratio ? res.ratio.toFixed(2) : "—"}:1 {res.pass ? "✓" : "✗"}
                    </span>
                    <SelectField value={res.level} options={["AA", "AAA"] as const}
                      onCommit={(lvl) => setLevel(res.ruleId, lvl)} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {a.minTargetSize && (
          <EditRow label="Minimum target size (px)">
            <div className="flex items-center gap-2">
              <NumberField value={a.minTargetSize.width} min={1}
                onCommit={(w) => patchComponent(c.id, {
                  accessibility: { ...a, minTargetSize: { ...a.minTargetSize!, width: w } },
                })} />
              <span className="text-faint">×</span>
              <NumberField value={a.minTargetSize.height} min={1}
                onCommit={(h) => patchComponent(c.id, {
                  accessibility: { ...a, minTargetSize: { ...a.minTargetSize!, height: h } },
                })} />
              <span className={size.pass ? "text-green-600" : "text-red-600"}>
                {size.pass ? "✓" : `min ${size.minimum}`}
              </span>
            </div>
          </EditRow>
        )}
        {a.keyboard && <Field label="Keyboard">{a.keyboard.join(", ")}</Field>}
        {a.aria?.role && <Field label="ARIA role">{a.aria.role}</Field>}
        {a.focus && <Field label="Focus visible">{a.focus.visible ? "yes" : "no"}</Field>}
      </div>
    );
  }
  if (sel.kind === "token" && sel.node.type === "color") {
    const hex = resolveColor(ds, sel.node.id) ?? "#000000";
    return (
      <div className="py-1 text-[13px]">
        <Field label="Resolved"><Mono>{hex}</Mono></Field>
        <Field label="Contrast">See the contrast badges on the canvas.</Field>
      </div>
    );
  }
  return <Empty>Accessibility checks apply to components and color tokens.</Empty>;
}

function DocumentationTab({ sel }: { sel: ResolvedNode }) {
  const patchDoc = useWorkspace((s) => s.patchDoc);
  const patchComponent = useWorkspace((s) => s.patchComponent);
  const patchPattern = useWorkspace((s) => s.patchPattern);
  const patchToken = useWorkspace((s) => s.patchToken);

  if (sel.kind === "doc") {
    return <TextArea value={sel.node.body} rows={14} onCommit={(v) => patchDoc(sel.node.id, { body: v })} />;
  }
  if (sel.kind === "component") {
    return (
      <TextArea value={sel.node.docs ?? ""} rows={12}
        onCommit={(v) => patchComponent(sel.node.id, { docs: v })} />
    );
  }
  if (sel.kind === "pattern") {
    return (
      <TextArea value={sel.node.docs ?? ""} rows={12}
        onCommit={(v) => patchPattern(sel.node.id, { docs: v })} />
    );
  }
  return (
    <EditRow label="Usage">
      <TextArea value={sel.node.usage ?? ""} rows={6}
        onCommit={(v) => patchToken(sel.node.id, { usage: v })} />
    </EditRow>
  );
}

function VersionTab({ ds, sel }: { ds: DesignSystem; sel: ResolvedNode }) {
  const m = sel.node.meta;
  const reference = ds.published ?? { tokens: [], components: [], patterns: [], docs: [] };
  const draft = countChanges(reference, ds).total;
  const history = [...ds.history].reverse();
  return (
    <div className="space-y-4 py-1">
      <div>
        {"status" in sel.node && <Field label="Status">{sel.node.status}</Field>}
        <Field label="Created"><Mono>{m.createdAt}</Mono></Field>
        <Field label="Updated"><Mono>{m.updatedAt}</Mono></Field>
      </div>

      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
          Draft
        </div>
        <div className="text-[13px] text-strong">
          {draft > 0 ? `${draft} uncommitted change(s)` : "No uncommitted changes"}
        </div>
      </div>

      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
          History
        </div>
        {history.length === 0 ? (
          <Empty>No commits yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {history.map((c) => (
              <li key={c.id} className="rounded-md border border-line/60 bg-page px-2.5 py-2">
                <div className="text-[13px] font-medium text-strong">{c.message}</div>
                <div className="mt-0.5 text-[11px] text-faint">
                  {new Date(c.createdAt).toLocaleString()} · {c.changes.length} change(s)
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// --- shell -----------------------------------------------------------------

export function Inspector() {
  const ds = useWorkspace((s) => s.ds);
  const selection = useWorkspace((s) => s.selection);
  const tab = useWorkspace((s) => s.tab);
  const setTab = useWorkspace((s) => s.setTab);
  const sel = resolveSelection(ds, selection);

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-line bg-surface">
      <div className="flex flex-wrap gap-1 border-b border-line p-2" role="tablist" aria-label="Inspector">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-2.5 py-1 text-[12px] ${
              tab === t.id ? "bg-primary text-white" : "text-muted hover:bg-page hover:text-strong"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        {!sel ? (
          <Empty>Nothing selected.</Empty>
        ) : tab === "properties" ? (
          <PropertiesTab ds={ds} sel={sel} />
        ) : tab === "dependencies" ? (
          <DependenciesTab ds={ds} sel={sel} />
        ) : tab === "code" ? (
          <CodeTab ds={ds} sel={sel} />
        ) : tab === "ai" ? (
          <AiTab ds={ds} sel={sel} />
        ) : tab === "accessibility" ? (
          <AccessibilityTab ds={ds} sel={sel} />
        ) : tab === "documentation" ? (
          <DocumentationTab sel={sel} />
        ) : (
          <VersionTab ds={ds} sel={sel} />
        )}
      </div>
    </aside>
  );
}
