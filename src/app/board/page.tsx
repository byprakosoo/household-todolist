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

export default function BoardPage() {
  const { household, isLoading, session } = useAuth();
  const router = useRouter();
  const current = getCurrentWeek();
  const [week_number, setWeekNumber] = useState(current.week_number);
  const [year, setYear] = useState(current.year);

  const isCurrentWeek =
    week_number === current.week_number && year === current.year;

  const navigate = (direction: -1 | 1) => {
    const next = getAdjacentWeek(week_number, year, direction);
    setWeekNumber(next.week_number);
    setYear(next.year);
  };

  const { createTask } = useTasks(week_number, year);

  useEffect(() => {
    if (!isLoading && session && !household) {
      router.push("/onboarding");
    }
  }, [isLoading, session, household, router]);

  if (!isLoading && session && !household) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <h1 className="text-lg font-semibold">
            {formatWeekRange(week_number, year)}
          </h1>
          <p className="text-xs text-muted-foreground">
            Week {week_number}, {year}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(1)}
          disabled={isCurrentWeek}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {!household?.rollover_confirmed && isCurrentWeek && household && (
        <button
          onClick={() => router.push("/rollover")}
          className="w-full flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-amber-600 dark:text-amber-400 text-sm hover:bg-amber-500/10 transition-colors"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            You have unfinished tasks from last week. Review & roll over to this week.
          </span>
        </button>
      )}

      <TaskList week_number={week_number} year={year} />

      <CreateTaskInput onCreate={createTask} />
    </div>
  );
}
