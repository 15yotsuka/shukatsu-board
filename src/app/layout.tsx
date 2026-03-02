import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "ShukatsuBoard - 就活管理ツール",
  description: "就活の応募企業・選考状況・面接日程・ESを一元管理",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased bg-[#F2F2F7] text-[#1C1C1E]">
        <Header />
        <main className="pt-14 pb-16 min-h-screen">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
