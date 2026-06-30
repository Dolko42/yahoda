"use client";

import { useEffect } from "react";

/** Call `onEscape` when the Escape key is pressed (for closing dialogs). */
export function useEscape(onEscape: () => void): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onEscape]);
}
