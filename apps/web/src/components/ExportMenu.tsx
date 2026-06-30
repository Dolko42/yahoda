"use client";

import { useMemo, useState } from "react";
import { type ExportTarget, exportTargets } from "@yahoda/core";
import { useWorkspace } from "@/store/workspace";
import { useEscape } from "@/lib/useEscape";

function ExportDialog({ target, onClose }: { target: ExportTarget; onClose: () => void }) {
  const ds = useWorkspace((s) => s.ds);
  useEscape(onClose);
  const content = useMemo(() => target.run(ds), [target, ds]);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  const download = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = target.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Export ${target.label}`}
        className="flex max-h-[82vh] w-[640px] flex-col overflow-hidden rounded-2xl bg-page shadow-app-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <h2 className="text-[15px] font-semibold text-strong">Export · {target.label}</h2>
            <p className="font-mono text-[11px] text-faint">{target.filename}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copy}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] text-muted hover:text-strong"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={download}
              className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90"
            >
              Download
            </button>
          </div>
        </div>
        <pre className="min-h-0 flex-1 overflow-auto bg-[#181A1D] p-4 font-mono text-[12px] leading-relaxed text-[#E3E6EA]">
          {content}
        </pre>
      </div>
    </div>
  );
}

export function ExportMenu() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ExportTarget | null>(null);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-line bg-page px-3 py-1.5 text-[13px] text-muted hover:text-strong"
      >
        Export ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-52 overflow-hidden rounded-lg border border-line bg-page py-1 shadow-app-2">
            {exportTargets.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setActive(t);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] text-strong hover:bg-surface"
              >
                <span>{t.label}</span>
                <span className="font-mono text-[10px] text-faint">{t.language}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {active && <ExportDialog target={active} onClose={() => setActive(null)} />}
    </div>
  );
}
