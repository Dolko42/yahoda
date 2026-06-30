"use client";

import { useMemo, useState } from "react";
import { type DesignSystem, getDependents } from "@yahoda/core";
import { useWorkspace } from "@/store/workspace";
import { findToken, labelFor } from "@/lib/nodes";
import { kindLabel } from "@/lib/format";

/**
 * Delete a token safely. If nothing uses it, delete directly. If it is in use, the user must
 * either cancel or reassign its usages to another compatible token first — references are
 * never left broken.
 */
export function DeleteTokenButton({ ds, tokenId }: { ds: DesignSystem; tokenId: string }) {
  const [confirming, setConfirming] = useState(false);
  const removeTokenSafely = useWorkspace((s) => s.removeTokenSafely);

  const token = findToken(ds, tokenId);
  const dependents = useMemo(() => getDependents(ds, tokenId), [ds, tokenId]);
  const used = dependents.length > 0;

  // compatible replacements: same token type, excluding the token being deleted
  const replacements = useMemo(
    () => (token ? ds.tokens.filter((t) => t.type === token.type && t.id !== tokenId) : []),
    [ds.tokens, token, tokenId],
  );
  const [reassignTo, setReassignTo] = useState<string>("");

  if (!token) return null;

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="mt-3 rounded-md border border-red-300 bg-white px-2.5 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-50"
      >
        Delete token
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3">
      {used ? (
        <>
          <div className="text-[12px] font-semibold text-red-700">
            {dependents.length} place{dependents.length === 1 ? "" : "s"} use this token. Reassign
            them to another <span className="font-mono">{token.type}</span> token before deleting.
          </div>
          <ul className="mt-1.5 max-h-28 space-y-0.5 overflow-y-auto">
            {dependents.map((r) => (
              <li key={r.id} className="text-[12px] text-red-700">
                <span className="text-red-500">{kindLabel(r.kind)}</span> · {labelFor(ds, r.kind, r.id)}
              </li>
            ))}
          </ul>
          <label className="mt-3 block text-[11px] uppercase tracking-wide text-red-700/80">
            Reassign usages to
          </label>
          <select
            value={reassignTo}
            onChange={(e) => setReassignTo(e.target.value)}
            className="mt-1 w-full rounded-md border border-red-300 bg-white px-2 py-1 text-[13px] text-strong outline-none focus:border-red-500"
          >
            <option value="">Choose a replacement…</option>
            {replacements.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {replacements.length === 0 && (
            <div className="mt-1.5 text-[11px] text-red-600">
              No other {token.type} token exists to reassign to. Create one first.
            </div>
          )}
        </>
      ) : (
        <div className="text-[12px] text-red-700">Nothing uses this token. Safe to delete.</div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          disabled={used && !reassignTo}
          onClick={() => {
            removeTokenSafely(tokenId, used ? reassignTo : undefined);
            setConfirming(false);
            setReassignTo("");
          }}
          className="rounded-md bg-red-600 px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {used ? "Reassign & delete" : "Delete"}
        </button>
        <button
          onClick={() => {
            setConfirming(false);
            setReassignTo("");
          }}
          className="rounded-md border border-line bg-white px-2.5 py-1.5 text-[12px] text-muted hover:text-strong"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
