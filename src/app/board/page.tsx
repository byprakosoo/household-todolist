"use client";

import { useState, useEffect } from "react";
import { TaskList } from "@/components/tasks/task-list";
import { CreateTaskInput } from "@/components/tasks/create-task-input";
import { Button } from "@/components/ui/button";
import { getCurrentWeek, getAdjacentWeek, formatWeekRange } from "@/lib/constants";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTasks } from "@/hooks/use-tasks";
import { useRouter } from "next/navigation";
import { getISOWeek, getISOWeekYear, startOfISOWeek, addWeeks } from "date-fns";

export default function BoardPage() {
  const { household, supabase } = useAuth();
  const router = useRouter();
  const current = getCurrentWeek();
  const [week_number, setWeekNumber] = useState(current.week_number);
  const [year, setYear] = useState(current.year);
  const [pendingCount, setPendingCount] = useState(0);

  const isCurrentWeek =
    week_number === current.week_number && year === current.year;

  const navigate = (direction: -1 | 1) => {
    const next = getAdjacentWeek(week_number, year, direction);
    setWeekNumber(next.week_number);
    setYear(next.year);
  };

  const { tasks, isLoading: tasksLoading, createTask, updateTask, deleteTask } = useTasks(week_number, year);

  useEffect(() => {
    if (!household) return;
    const checkPending = async () => {
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

      setPendingCount(count ?? 0);

      if (count === 0 && !household.rollover_confirmed) {
        await supabase
          .from("households")
          .update({
            rollover_confirmed: true,
            confirmed_week: getISOWeek(now),
            confirmed_year: getISOWeekYear(now),
          })
          .eq("id", household.id);
      }
    };
    checkPending();
  }, [household, supabase]);

  const showBanner = household && !household.rollover_confirmed && isCurrentWeek && pendingCount > 0;

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

      <TaskList tasks={tasks} isLoading={tasksLoading} updateTask={updateTask} deleteTask={deleteTask} />

      <CreateTaskInput onCreate={createTask} />
    </div>
  );
}
