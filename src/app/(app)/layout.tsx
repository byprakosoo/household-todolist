"use client";

import { BottomNav } from "@/components/nav/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-lg px-6 pt-10 pb-28">{children}</main>
      <BottomNav />
    </div>
  );
}
