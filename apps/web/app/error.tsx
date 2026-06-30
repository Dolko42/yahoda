"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div className="max-w-md">
        <div className="text-[15px] font-semibold text-strong">Something went wrong</div>
        <p className="mt-1 text-[13px] text-muted">
          The workspace hit an unexpected error. Your draft is saved locally.
        </p>
        <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-surface p-3 text-left font-mono text-[11px] text-faint">
          {error.message}
        </pre>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
