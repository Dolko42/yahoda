import { type TokenValue, isRefValue } from "@yahoda/core";

/** Format a token value (raw or resolved) for compact display in the inspector. */
export function formatTokenValue(value: TokenValue): string {
  if (isRefValue(value)) return `→ ${value.$ref}`;
  if ("color" in value) return value.color;
  if ("dimension" in value) return `${value.dimension}${value.unit}`;
  if ("typography" in value) {
    const t = value.typography;
    const size = isRefValue(t.fontSize)
      ? `→${t.fontSize.$ref}`
      : `${t.fontSize.dimension}${t.fontSize.unit}`;
    return `${t.fontFamily} ${size}/${t.lineHeight} ${t.fontWeight}`;
  }
  if ("shadow" in value) {
    return value.shadow
      .map((l) => {
        const px = (d: { dimension: number; unit: string }) => `${d.dimension}${d.unit}`;
        const color = isRefValue(l.color) ? `→${l.color.$ref}` : l.color.color;
        return `${px(l.x)} ${px(l.y)} ${px(l.blur)} ${px(l.spread)} ${color}`;
      })
      .join(", ");
  }
  if ("border" in value) {
    const b = value.border;
    const width = isRefValue(b.width) ? `→${b.width.$ref}` : `${b.width.dimension}${b.width.unit}`;
    const color = isRefValue(b.color) ? `→${b.color.$ref}` : b.color.color;
    return `${width} ${b.style} ${color}`;
  }
  if ("duration" in value) return `${value.duration}${value.unit}`;
  if ("easing" in value)
    return Array.isArray(value.easing)
      ? `cubic-bezier(${value.easing.join(", ")})`
      : value.easing;
  if ("opacity" in value) return String(value.opacity);
  if ("zIndex" in value) return String(value.zIndex);
  return "—";
}

const KIND_LABEL: Record<string, string> = {
  token: "Token",
  component: "Component",
  pattern: "Pattern",
  doc: "Doc",
};

export const kindLabel = (kind: string): string => KIND_LABEL[kind] ?? kind;
