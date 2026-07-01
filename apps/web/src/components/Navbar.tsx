"use client";

import { useMemo, useState } from "react";
import { useWorkspace } from "@/store/workspace";
import { countChanges } from "@/lib/diff";
import { PublishDialog } from "./PublishDialog";
import { ExportMenu } from "./ExportMenu";
import { AuthControl } from "./AuthControl";

export function Navbar() {
  const ds = useWorkspace((s) => s.ds);
  const baseline = useWorkspace((s) => s.baseline);
  const discardDraft = useWorkspace((s) => s.discardDraft);
  const published = ds.published !== null;
  const [publishing, setPublishing] = useState(false);

  // dirty vs the last published snapshot (or the origin seed if never published)
  const reference = ds.published ?? baseline;
  const draftCount = useMemo(() => countChanges(reference, ds).total, [reference, ds]);
  const canPublish = !published || draftCount > 0;

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface px-4">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-[13px] font-bold text-white">
          Y
        </div>
        <span className="text-[15px] font-semibold tracking-tight">Yahoda</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span
          className="flex items-center gap-1.5 text-[12px] text-muted"
          title={published ? "Published" : "Never published"}
        >
          <span className={`h-2 w-2 rounded-full ${draftCount > 0 ? "bg-primary" : "bg-faint"}`} />
          {draftCount > 0 ? `${draftCount} unpublished` : published ? "Published" : "Draft"}
        </span>

        <AuthControl />
        <ExportMenu />
        <button
          onClick={discardDraft}
          disabled={draftCount === 0}
          className="rounded-lg border border-line bg-page px-3 py-1.5 text-[13px] text-muted enabled:hover:text-strong disabled:cursor-not-allowed disabled:opacity-50"
          title="Discard all draft changes"
        >
          Discard
        </button>
        <button
          onClick={() => setPublishing(true)}
          disabled={!canPublish}
          className="rounded-lg bg-primary px-3.5 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Publish
        </button>
      </div>

      {publishing && <PublishDialog onClose={() => setPublishing(false)} />}
    </header>
  );
}
