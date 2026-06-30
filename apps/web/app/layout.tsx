import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yahoda — design system workspace",
  description:
    "A single source of truth for AI-friendly, designer-friendly, and developer-friendly UI systems.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
