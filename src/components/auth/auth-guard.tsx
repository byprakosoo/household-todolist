"use client";

import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, session, household } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      router.replace("/login");
      return;
    }

    if (!household && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }

    if (household && pathname === "/onboarding") {
      router.replace("/board");
    }
  }, [isLoading, session, household, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return null;
  if (!household && pathname !== "/onboarding") return null;
  if (household && pathname === "/onboarding") return null;

  return <>{children}</>;
}
