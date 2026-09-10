import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "記憶に関する研究 | Mock",
  description: "ResearchPilotSystemの参加者フローを確認するローカルmock",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
