"use client";

import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/board", label: "Board", icon: CalendarDays },
  { href: "/summary", label: "Summary", icon: BarChart3 },
  { href: "/settings/categories", label: "Categories", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-lg safe-area-inset-bottom z-50">
      <div className="mx-auto max-w-lg flex items-center justify-around h-16 px-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-5 py-2 text-[11px] font-medium transition-all rounded-xl",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-[22px] w-[22px] transition-all",
                  isActive && "text-primary drop-shadow-sm"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
