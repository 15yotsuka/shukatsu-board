import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ToastDisplay } from "@/components/layout/ToastDisplay";
import { PageTransition } from "@/components/layout/PageTransition";
import { NotificationScheduler } from "@/components/layout/NotificationScheduler";
import { DeadlineProvider } from "@/contexts/DeadlineContext";
import GradYearSelectModal from "@/components/onboarding/GradYearSelectModal";

export const metadata: Metadata = {
  title: "ShukatsuBoard - 就活管理ツール",
  description: "就活の応募企業・選考状況・面接日程・ESを一元管理",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-300">
        <ThemeProvider>
          <DeadlineProvider>
            <Header />
            <main className="pb-16 min-h-screen" style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top))' }}>
              <PageTransition>{children}</PageTransition>
            </main>
            <BottomNav />
            <ToastDisplay />
            <GradYearSelectModal />
            <NotificationScheduler />
          </DeadlineProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
