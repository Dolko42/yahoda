import type { Token, TokenType, TokenValue } from "@yahoda/core";

/** Stable UUID for a new token (every core object gets a stable id from day one). */
export const newTokenId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `t.${crypto.randomUUID()}`
    : `t.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** A sensible starting value for a freshly created token of the given type. */
export function defaultTokenValue(type: TokenType): TokenValue {
  switch (type) {
    case "color":
      return { color: "#3B82F6" };
    case "dimension":
      return { dimension: 8, unit: "px" };
    case "fontFamily":
      return { fontFamily: "Inter, system-ui, sans-serif" };
    case "typography":
      return {
        typography: {
          fontFamily: "Inter",
          fontSize: { dimension: 1, unit: "rem" },
          lineHeight: 1.5,
          fontWeight: 400,
        },
      };
    case "shadow":
      return {
        shadow: [
          {
            x: { dimension: 0, unit: "px" },
            y: { dimension: 1, unit: "px" },
            blur: { dimension: 2, unit: "px" },
            spread: { dimension: 0, unit: "px" },
            color: { color: "rgba(0,0,0,0.12)" },
          },
        ],
      };
    case "border":
      return {
        border: { width: { dimension: 1, unit: "px" }, style: "solid", color: { color: "#000000" } },
      };
    case "duration":
      return { duration: 150, unit: "ms" };
    case "easing":
      return { easing: "ease" };
    case "opacity":
      return { opacity: 1 };
    case "zIndex":
      return { zIndex: 1 };
  }
}

/** Default dotted-name prefix to suggest when creating a token of a type. */
export function defaultNamePrefix(type: TokenType): string {
  switch (type) {
    case "color":
      return "color";
    case "dimension":
      return "spacing";
    case "fontFamily":
      return "fontFamily";
    case "typography":
      return "typography";
    case "shadow":
      return "shadow";
    case "border":
      return "border";
    case "duration":
      return "duration";
    case "easing":
      return "easing";
    case "opacity":
      return "opacity";
    case "zIndex":
      return "zIndex";
  }
}

/** Build a draft Token ready to add to the working set. */
export function makeToken(opts: {
  type: TokenType;
  name: string;
  tier?: Token["tier"];
  group?: string;
  value?: TokenValue;
}): Token {
  const now = new Date().toISOString();
  return {
    id: newTokenId(),
    name: opts.name,
    type: opts.type,
    tier: opts.tier ?? "semantic",
    value: opts.value ?? defaultTokenValue(opts.type),
    ...(opts.group ? { group: opts.group } : {}),
    meta: { createdAt: now, updatedAt: now },
  };
}

/** True if a dotted token name is syntactically valid and unique within the system. */
export function validateTokenName(
  name: string,
  existing: readonly Token[],
  selfId?: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Name is required.";
  if (!/^[a-z0-9]+(\.[a-z0-9-]+)*$/i.test(trimmed))
    return "Use a dotted path, e.g. color.primary";
  if (existing.some((t) => t.name === trimmed && t.id !== selfId))
    return `A token named "${trimmed}" already exists.`;
  return null;
}
