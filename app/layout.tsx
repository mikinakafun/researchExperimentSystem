import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "記憶に関する研究 | Mock",
  description: "PROTOCOL v0.4.0-draft・Prompt Catalog v0.4.3 に基づく参加者フローのローカル mock",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
