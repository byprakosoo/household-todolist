"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonthLabel } from "@/lib/constants";
import type { MonthlySummary, CategorySummary } from "@/types";

interface SummaryData {
  monthly: MonthlySummary[];
  categories: CategorySummary[];
}

export default function SummaryPage() {
  const { household, supabase } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    if (!household) return;
    const fetchSummary = async () => {
      setIsLoading(true);

      if (tab === "monthly") {
        const { data: tasks } = await supabase
          .from("tasks")
          .select("week_number, is_done, rolled_over_from, category_id, category:task_categories(*)")
          .eq("household_id", household.id)
          .eq("year", year);

        const taskData = (tasks || []) as unknown as Array<{
          week_number: number;
          is_done: boolean;
          rolled_over_from: string | null;
          category_id: string | null;
          category: { name: string; color_hex: string; emoji: string | null; deleted_at: string | null } | null;
        }>;
        const weeks = new Map<number, MonthlySummary>();
        const cats = new Map<string, CategorySummary>();

        for (const t of taskData) {
          const weekKey = t.week_number;
          if (!weeks.has(weekKey)) {
            weeks.set(weekKey, { week_number: weekKey, year, created: 0, done: 0, rolled_over: 0 });
          }
          const w = weeks.get(weekKey)!;
          w.created++;
          if (t.is_done) w.done++;
          if (t.rolled_over_from) w.rolled_over++;

          const catId = t.category_id || "__none__";
          if (!cats.has(catId)) {
            cats.set(catId, {
              category_id: t.category_id,
              category_name: t.category?.name || "Uncategorized",
              category_color: t.category?.color_hex || "#9CA3AF",
              category_emoji: t.category?.emoji || null,
              done: 0,
              rolled_over: 0,
            });
          }
          const c = cats.get(catId)!;
          if (t.is_done) c.done++;
          if (t.rolled_over_from) c.rolled_over++;
        }

        setData({
          monthly: Array.from(weeks.values()).sort((a, b) => a.week_number - b.week_number),
          categories: Array.from(cats.values()),
        });
      } else {
        const { data: tasks } = await supabase
          .from("tasks")
          .select("year, week_number, is_done, category_id")
          .eq("household_id", household.id);

        const months = new Map<string, { month: number; year: number; total: number; done: number }>();

        for (const t of (tasks || []) as Array<{ year: number; week_number: number; is_done: boolean }>) {
          const date = new Date(t.year, 0, 1 + (t.week_number - 1) * 7);
          const mKey = `${t.year}-${date.getMonth() + 1}`;
          if (!months.has(mKey)) {
            months.set(mKey, { month: date.getMonth() + 1, year: t.year, total: 0, done: 0 });
          }
          const m = months.get(mKey)!;
          m.total++;
          if (t.is_done) m.done++;
        }

        setData({
          monthly: Array.from(months.values())
            .sort((a, b) => a.year - b.year || a.month - b.month)
            .map((m) => ({
              week_number: m.month,
              year: m.year,
              created: m.total,
              done: m.done,
              rolled_over: 0,
            })),
          categories: [],
        });
      }

      setIsLoading(false);
    };
    fetchSummary();
  }, [household, supabase, month, year, tab]);

  const navigateMonth = (dir: -1 | 1) => {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    setMonth(newMonth);
    setYear(newYear);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Summary</h1>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <Button
            variant={tab === "monthly" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab("monthly")}
            className="text-xs h-7"
          >
            Monthly
          </Button>
          <Button
            variant={tab === "yearly" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab("yearly")}
            className="text-xs h-7"
          >
            Yearly
          </Button>
        </div>
      </div>

      {tab === "monthly" && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">{formatMonthLabel(month, year)}</span>
          <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {tab === "monthly" && data?.monthly.map((w) => (
            <Card key={w.week_number} className="overflow-hidden">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium">
                  Week {w.week_number}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-4 space-y-2">
                <div className="flex gap-2 text-xs">
                  <div className="flex-1 bg-primary/10 rounded-md p-2 text-center">
                    <div className="text-lg font-bold">{w.created}</div>
                    <div className="text-muted-foreground">Created</div>
                  </div>
                  <div className="flex-1 bg-green-500/10 rounded-md p-2 text-center">
                    <div className="text-lg font-bold text-green-600">{w.done}</div>
                    <div className="text-muted-foreground">Done</div>
                  </div>
                  <div className="flex-1 bg-amber-500/10 rounded-md p-2 text-center">
                    <div className="text-lg font-bold text-amber-600">{w.rolled_over}</div>
                    <div className="text-muted-foreground">Rolled Over</div>
                  </div>
                </div>
                {w.created > 0 && (
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.round((w.done / w.created) * 100)}%` }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {tab === "monthly" && (data?.categories ?? []).length > 0 && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium">By Category</CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-4">
                <div className="space-y-2">
                  {data?.categories.map((c) => (
                    <div key={c.category_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: c.category_color || "#9CA3AF" }}
                        />
                        {c.category_emoji && <span className="text-sm">{c.category_emoji}</span>}
                        <span className="text-sm">{c.category_name}</span>
                      </div>
                      <span className="text-sm font-medium text-green-600">{c.done} done</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === "yearly" && (
            <div className="grid grid-cols-3 gap-3">
              {data?.monthly.map((m) => {
                const pct = m.created > 0 ? Math.round((m.done / m.created) * 100) : 0;
                return (
                  <Card
                    key={`${m.year}-${m.week_number}`}
                    className="text-center py-3 px-2 hover:border-primary/50 cursor-pointer transition-colors"
                  >
                    <div className="text-xs text-muted-foreground">{formatMonthLabel(m.week_number, m.year).substring(0, 3)}</div>
                    <div className="text-2xl font-bold mt-1" style={{ color: pct > 50 ? "#22C55E" : pct > 20 ? "#EAB308" : "#EF4444" }}>
                      {pct}%
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {m.done}/{m.created} done
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {!isLoading &&
            ((tab === "monthly" && !data?.monthly.length) ||
              (tab === "yearly" && !data?.monthly.length)) && (
            <div className="text-center py-16 space-y-3">
              <div className="text-4xl">📊</div>
              <p className="text-muted-foreground font-medium">No data yet</p>
              <p className="text-sm text-muted-foreground">
                Complete some tasks to see your summary.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
