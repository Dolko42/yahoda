"use client";

import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { signInWithEmail, signOut, useSession } from "@/lib/supabase/auth";

/** Sign-in / sign-out affordance. Renders nothing unless a Supabase backend is configured. */
export function AuthControl() {
  const { userEmail, loading } = useSession();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  if (!isSupabaseConfigured() || loading) return null;

  if (userEmail) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-muted">
        <span className="hidden sm:inline">{userEmail}</span>
        <button
          onClick={() => void signOut()}
          className="rounded-lg border border-line bg-page px-2.5 py-1.5 hover:text-strong"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-line bg-page px-3 py-1.5 text-[13px] text-muted hover:text-strong"
      >
        Sign in
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-72 rounded-lg border border-line bg-surface p-3 shadow-app-2">
            <div className="mb-2 text-[12px] text-muted">
              Get a magic sign-in link by email.
            </div>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-[13px] text-strong outline-none focus:border-primary"
            />
            {status && <div className="mt-1.5 text-[11px] text-muted">{status}</div>}
            <button
              onClick={async () => {
                setStatus("Sending…");
                const err = await signInWithEmail(email.trim());
                setStatus(err ?? "Check your email for the link.");
              }}
              disabled={!email.trim()}
              className="mt-2 w-full rounded-md bg-primary px-2.5 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              Send link
            </button>
          </div>
        </>
      )}
    </div>
  );
}
