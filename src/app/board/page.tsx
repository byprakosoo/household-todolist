"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TaskList } from "@/components/tasks/task-list";
import { CreateTaskInput } from "@/components/tasks/create-task-input";
import { Button } from "@/components/ui/button";
import { getCurrentWeek, getAdjacentWeek, formatWeekRange } from "@/lib/constants";
import { ChevronLeft, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTasks } from "@/hooks/use-tasks";
import { useCategories } from "@/hooks/use-categories";
import { useRouter } from "next/navigation";
import { getISOWeek, getISOWeekYear, startOfISOWeek, addWeeks } from "date-fns";
import toast from "react-hot-toast";

export default function BoardPage() {
  const { household, supabase, refreshHousehold } = useAuth();
  const router = useRouter();
  const current = getCurrentWeek();
  const [week_number, setWeekNumber] = useState(current.week_number);
  const [year, setYear] = useState(current.year);
  const [pendingCount, setPendingCount] = useState(0);
  const [isCarryingForward, setIsCarryingForward] = useState(false);
  const carryForwardKeyRef = useRef<string | null>(null);

  const isCurrentWeek =
    week_number === current.week_number && year === current.year;

  const navigate = useCallback((direction: -1 | 1) => {
    const next = getAdjacentWeek(week_number, year, direction);
    setWeekNumber(next.week_number);
    setYear(next.year);
  }, [week_number, year]);

  const { tasks, isLoading: tasksLoading, createTask, updateTask, deleteTask, refetch } = useTasks(week_number, year);
  const { categories, createCategory } = useCategories();

  useEffect(() => {
    if (!household || !isCurrentWeek) return;

    const currentWeek = current.week_number;
    const currentYear = current.year;
    const confirmedForCurrentWeek =
      household.rollover_confirmed &&
      household.confirmed_week === currentWeek &&
      household.confirmed_year === currentYear;

    if (confirmedForCurrentWeek) {
      setPendingCount(0);
      return;
    }

    const carryForwardKey = `${household.id}-${currentYear}-${currentWeek}`;
    if (carryForwardKeyRef.current === carryForwardKey) return;
    carryForwardKeyRef.current = carryForwardKey;

    let isCancelled = false;

    const carryForwardPendingTasks = async () => {
      const now = new Date();
      const prevWeekStart = addWeeks(startOfISOWeek(now), -1);
      const prevWeek = getISOWeek(prevWeekStart);
      const prevYear = getISOWeekYear(prevWeekStart);

      const { count } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("household_id", household.id)
        .eq("week_number", prevWeek)
        .eq("year", prevYear)
        .eq("is_done", false);

      if (isCancelled) return;
      setPendingCount(count ?? 0);
      setIsCarryingForward((count ?? 0) > 0);

      try {
        const response = await fetch("/api/rollover/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceWeek: prevWeek,
            sourceYear: prevYear,
            targetWeek: currentWeek,
            targetYear: currentYear,
            householdId: household.id,
          }),
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to carry tasks forward.");
        }

        if (isCancelled) return;
        setPendingCount(0);
        await Promise.all([refetch(), refreshHousehold()]);

        if (result.count > 0) {
          toast.success(`${result.count} unfinished task${result.count !== 1 ? "s" : ""} carried forward`);
        }
      } catch {
        if (isCancelled) return;
        carryForwardKeyRef.current = null;
        toast.error("Failed to carry unfinished tasks forward.");
      } finally {
        if (!isCancelled) setIsCarryingForward(false);
      }
    };
    carryForwardPendingTasks();

    return () => {
      isCancelled = true;
    };
  }, [
    current.week_number,
    current.year,
    household,
    isCurrentWeek,
    refetch,
    refreshHousehold,
    supabase,
  ]);

  const showBanner = household && isCurrentWeek && pendingCount > 0 && !isCarryingForward;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight">
            {formatWeekRange(week_number, year)}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Week {week_number}, {year}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => navigate(1)}
          disabled={isCurrentWeek}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {showBanner && (
        <button
          onClick={() => router.push("/rollover")}
          className="w-full flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-600 dark:text-amber-400 text-sm hover:bg-amber-500/10 transition-colors"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            You have {pendingCount} unfinished task{pendingCount !== 1 ? "s" : ""} from last week. Review & roll over.
          </span>
        </button>
      )}

      {isCarryingForward && (
        <div className="w-full flex items-center gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-blue-600 dark:text-blue-400 text-sm">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>Carrying forward unfinished tasks from last week...</span>
        </div>
      )}

      <TaskList
        tasks={tasks}
        isLoading={tasksLoading}
        updateTask={updateTask}
        deleteTask={deleteTask}
        categories={categories}
        createCategory={createCategory}
      />

      <CreateTaskInput onCreate={createTask} categories={categories} createCategory={createCategory} />
    </div>
  );
}
