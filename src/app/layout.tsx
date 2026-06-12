import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "研究タスクマネージャー",
  description: "AIが支援する研究タスク管理アプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
