"use client";

import { type SupabaseClient, createClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client. Returns `null` when the project is not configured (no env
 * vars) so the app degrades to local-first IndexedDB persistence — the workspace keeps
 * working with zero backend setup. See docs/supabase-setup.md.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Accept the new-style publishable key (sb_publishable_...) or the legacy JWT anon key —
// either works as the client's public key. Next inlines both static references at build.
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  cached = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true } }) : null;
  return cached;
}

/** Whether a Supabase backend is configured for this build. */
export const isSupabaseConfigured = (): boolean => Boolean(url && anonKey);
