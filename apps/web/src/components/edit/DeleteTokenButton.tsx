"use client";

import { useState } from "react";
import { type DesignSystem, getBlastRadius } from "@yahoda/core";
import { useWorkspace } from "@/store/workspace";
import { labelFor } from "@/lib/nodes";
import { kindLabel } from "@/lib/format";

/** Delete a token with a visible blast-radius guard before confirming. */
export function DeleteTokenButton({ ds, tokenId }: { ds: DesignSystem; tokenId: string }) {
  const [confirming, setConfirming] = useState(false);
  const deleteToken = useWorkspace((s) => s.deleteToken);
  const impacted = getBlastRadius(ds, tokenId);

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
      {impacted.length > 0 ? (
        <>
          <div className="text-[12px] font-semibold text-red-700">
            {impacted.length} node{impacted.length === 1 ? "" : "s"} depend on this token and will
            break:
          </div>
          <ul className="mt-1.5 max-h-32 space-y-0.5 overflow-y-auto">
            {impacted.map((r) => (
              <li key={r.id} className="text-[12px] text-red-700">
                <span className="text-red-500">{kindLabel(r.kind)}</span> · {labelFor(ds, r.kind, r.id)}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="text-[12px] text-red-700">
          Nothing depends on this token. Safe to delete.
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => {
            deleteToken(tokenId);
            setConfirming(false);
          }}
          className="rounded-md bg-red-600 px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-red-700"
        >
          {impacted.length > 0 ? "Delete anyway" : "Delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-md border border-line bg-white px-2.5 py-1.5 text-[12px] text-muted hover:text-strong"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
