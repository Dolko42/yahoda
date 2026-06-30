"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "./client";

/**
 * Minimal magic-link auth. Single-user MVP: sign in with an email link, sign out, and
 * observe the current user. When Supabase is unconfigured these are inert and `user` is null
 * so the rest of the app runs local-only.
 */

export interface SessionState {
  userEmail: string | null;
  loading: boolean;
}

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ userEmail: null, loading: true });

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setState({ userEmail: null, loading: false });
      return;
    }
    let active = true;
    sb.auth.getUser().then(({ data }) => {
      if (active) setState({ userEmail: data.user?.email ?? null, loading: false });
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setState({ userEmail: session?.user?.email ?? null, loading: false });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

/** Send a magic sign-in link to the given email. Returns an error message or null. */
export async function signInWithEmail(email: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return "Supabase is not configured.";
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
  });
  return error ? error.message : null;
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
}
