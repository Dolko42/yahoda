# Supabase setup (Phase 2)

Yahoda is **local-first**. With no configuration it persists the workspace to the browser's
IndexedDB and works fully offline. Add Supabase to get a real backend with authentication,
stable cloud storage, and version history that follows you across devices.

## What persistence does

| Mode | Trigger | Behavior |
|------|---------|----------|
| Local only | No env vars set | Working set saved to IndexedDB; everything works, no account. |
| Cloud sync | Env vars set + signed in | Cloud is the source of truth on load; every edit is mirrored to Supabase (debounced) **and** cached locally. Cloud failures fall back to local — edits are never lost. |

## 1. Create a project

1. Create a project at <https://supabase.com>.
2. In **SQL Editor**, paste and run [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
   This creates `profiles`, `design_systems`, `tokens`, `components`, `commits`, the
   new-user trigger, and owner-only **Row Level Security** on every table.

## 2. Configure environment variables

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in:

| Variable | Where to find it | Notes |
|----------|------------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL | Public; safe in the browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon/public key | Public; RLS restricts access to the signed-in owner. |

Restart `pnpm dev` after changing env vars.

## 3. Authentication

Auth is **email magic link** (Supabase OTP). In the app, click **Sign in**, enter your
email, and follow the link. On first sign-in your current local workspace is pushed to the
cloud to seed the account; afterwards the cloud copy loads on every visit.

In Supabase: **Authentication → Providers → Email** is enabled by default. For local dev,
add `http://localhost:3000` under **Authentication → URL Configuration → Redirect URLs**.

## Data model (hybrid normalization)

- `tokens` and `components` are **first-class rows** with stable ids — listable and queryable
  (e.g. "all color tokens", dependency scans).
- A component's internals (variants, states, slots, **property→token bindings**,
  accessibility, AI rules, code, docs, examples) live in a `spec` jsonb column, because they
  are always loaded with the component and dependency resolution runs in `@yahoda/core`.
- `patterns`, `docs`, and the draft overlay ride in `design_systems.extras` (small, rarely
  queried).
- `commits` store an **immutable** full snapshot at publish time; `current_published_commit_id`
  points at the live published version. The in-memory `published` snapshot is reconstructed
  from that commit — never stored twice.

Stable UUIDs exist from day one for design systems, tokens, components, variants (inside
`spec`), properties (binding ids inside `spec`), and commits — the foundation for future
Figma sync, exports, MCP, imports, and AI references.

## Not in this phase

Organizations, team roles, sharing/permissions, realtime collaboration, comments, branching,
merge requests, public sharing, marketplace, Figma sync, MCP server, billing.
