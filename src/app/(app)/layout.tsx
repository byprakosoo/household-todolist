"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { BottomNav } from "@/components/nav/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = !pathname.includes("/login");

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-lg px-4 pt-6 pb-24">{children}</main>
        {showNav && <BottomNav />}
      </div>
    </AuthGuard>
  );
}
