#!/usr/bin/env node
// SessionStart hook: surface the latest entry from docs/session-log.md as session context,
// so each session opens knowing where the last one left off. Cross-platform (node).
// Fails open: any problem prints nothing and exits 0 — never blocks a session start.

import { readFileSync } from "node:fs";
import { join } from "node:path";

try {
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const raw = readFileSync(join(root, "docs", "session-log.md"), "utf8");

  // Drop HTML comment blocks (the template lives in one) so the real entries are first.
  const body = raw.replace(/<!--[\s\S]*?-->/g, "");

  // The newest entry is the first "## " heading; capture until the next one (or EOF).
  const match = body.match(/^##[^\n]*\n[\s\S]*?(?=\n## |$)/m);
  if (!match) process.exit(0);

  const entry = match[0].trim();
  const context =
    "Latest session handoff (from docs/session-log.md) — where the previous session " +
    "left off. Read it before starting work; run /handoff at the end of this session.\n\n" +
    entry;

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context },
    }),
  );
} catch {
  // no log yet, or unreadable — start the session without a handoff note
  process.exit(0);
}
