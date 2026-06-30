"use client";

import { type NodeRef, getDependencies, getDependents } from "@yahoda/core";
import { useWorkspace } from "@/store/workspace";
import { type ResolvedNode, labelFor } from "@/lib/nodes";

const KIND_COLOR: Record<string, string> = {
  token: "#2448B8",
  component: "#0E7C7B",
  pattern: "#6D4ABB",
  doc: "#50555D",
};

const NODE_W = 168;
const NODE_H = 34;
const STEP = 50;
const WIDTH = 760;
const MAX_PER_SIDE = 9;

function colYs(count: number, centerY: number): number[] {
  const total = (count - 1) * STEP;
  return Array.from({ length: count }, (_, i) => centerY - total / 2 + i * STEP);
}

function GraphNode({
  x,
  y,
  kind,
  label,
  emphasis,
  onClick,
}: {
  x: number;
  y: number;
  kind: string;
  label: string;
  emphasis?: boolean;
  onClick?: () => void;
}) {
  const color = KIND_COLOR[kind] ?? "#50555D";
  const text = label.length > 20 ? label.slice(0, 19) + "…" : label;
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && (e.key === "Enter" || e.key === " ") && onClick()}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <rect
        width={NODE_W}
        height={NODE_H}
        rx={8}
        fill="#ffffff"
        stroke={emphasis ? color : "#C4C9D1"}
        strokeWidth={emphasis ? 2 : 1}
      />
      <circle cx={16} cy={NODE_H / 2} r={4} fill={color} />
      <text x={30} y={NODE_H / 2 + 4} fontSize={12} fill="#181A1D" fontFamily="ui-monospace, monospace">
        {text}
      </text>
    </g>
  );
}

export function GraphView({ ds, sel }: { ds: ReturnType<typeof useWorkspace.getState>["ds"]; sel: ResolvedNode }) {
  const select = useWorkspace((s) => s.select);
  const usedBy = getDependents(ds, sel.node.id).slice(0, MAX_PER_SIDE);
  const uses = getDependencies(ds, sel.node.id).slice(0, MAX_PER_SIDE);

  const rows = Math.max(usedBy.length, uses.length, 1);
  const height = Math.max(rows * STEP + 80, 240);
  const centerY = height / 2;
  const leftX = 24;
  const rightX = WIDTH - NODE_W - 24;
  const centerX = (WIDTH - NODE_W) / 2;

  const leftYs = colYs(usedBy.length, centerY);
  const rightYs = colYs(uses.length, centerY);

  const edge = (x1: number, y1: number, x2: number, y2: number, i: number) => (
    <path
      key={`${x1}-${i}`}
      d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
      fill="none"
      stroke="#C4C9D1"
      strokeWidth={1.5}
    />
  );

  const name = (r: NodeRef) => labelFor(ds, r.kind, r.id);
  const empty = usedBy.length === 0 && uses.length === 0;

  return (
    <div className="ds-scope h-full overflow-auto rounded-xl bg-white p-4 shadow-app-1">
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-faint">
        <span>← used by</span>
        <span>relationships</span>
        <span>uses →</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} width="100%" role="img" aria-label="Relationship graph">
        {/* edges first */}
        {usedBy.map((_, i) => edge(leftX + NODE_W, leftYs[i]! + NODE_H / 2, centerX, centerY + NODE_H / 2, i))}
        {uses.map((_, i) => edge(centerX + NODE_W, centerY + NODE_H / 2, rightX, rightYs[i]! + NODE_H / 2, i))}

        {/* left: dependents */}
        {usedBy.map((r, i) => (
          <GraphNode key={r.id} x={leftX} y={leftYs[i]!} kind={r.kind} label={name(r)} onClick={() => select({ kind: r.kind, id: r.id })} />
        ))}
        {/* center: selected */}
        <GraphNode x={centerX} y={centerY} kind={sel.kind} label={sel.kind === "doc" ? sel.node.title : sel.node.name} emphasis />
        {/* right: dependencies */}
        {uses.map((r, i) => (
          <GraphNode key={r.id} x={rightX} y={rightYs[i]!} kind={r.kind} label={name(r)} onClick={() => select({ kind: r.kind, id: r.id })} />
        ))}

        {empty && (
          <text x={WIDTH / 2} y={centerY - 16} textAnchor="middle" fontSize={13} fill="#7C828B">
            No relationships for this node.
          </text>
        )}
      </svg>
    </div>
  );
}
