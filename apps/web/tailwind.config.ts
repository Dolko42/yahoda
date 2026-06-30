import type { Config } from "tailwindcss";

/**
 * Chrome theme only. All colors map to the neutral steel `--app-*` CSS variables
 * (see app/globals.css and docs/ui-system.md). The previewed design system uses its
 * own resolved token values (inline), never these classes — that keeps the two worlds
 * from bleeding into each other.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "var(--app-page)",
        surface: "var(--app-surface)",
        canvas: "var(--app-canvas)",
        line: "var(--app-border)",
        strong: "var(--app-text-strong)",
        muted: "var(--app-text-muted)",
        faint: "var(--app-text-faint)",
        primary: "var(--app-primary)",
      },
      borderColor: { DEFAULT: "var(--app-border)" },
      borderRadius: { canvas: "20px" },
      fontFamily: {
        sans: ["var(--app-font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--app-font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "app-1": "0 1px 2px rgba(24,26,29,0.06)",
        "app-2": "0 6px 20px -8px rgba(24,26,29,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
