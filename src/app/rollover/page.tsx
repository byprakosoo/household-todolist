"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";
import type { Task } from "@/types";
import toast from "react-hot-toast";
import { getISOWeek, getISOWeekYear, addWeeks, startOfISOWeek } from "date-fns";

export default function RolloverPage() {
  const { household, supabase } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!household) return;
    const fetchPending = async () => {
      const now = new Date();
      const currentWeekStart = startOfISOWeek(now);
      const prevWeekStart = addWeeks(currentWeekStart, -1);
      const prevWeekNum = getISOWeek(prevWeekStart);
      const prevYear = getISOWeekYear(prevWeekStart);

      const { data } = await supabase
        .from("tasks")
        .select("*, category:task_categories(*)")
        .eq("household_id", household.id)
        .eq("week_number", prevWeekNum)
        .eq("year", prevYear)
        .eq("is_done", false)
        .order("sort_order", { ascending: true });

      const taskData = (data as Task[]) || [];
      setTasks(taskData);
      setSelectedIds(new Set(taskData.map((t) => t.id)));
      setIsLoading(false);
    };
    fetchPending();
  }, [household, supabase]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!household) return;
    setIsConfirming(true);

    const now = new Date();
    const currentWeek = getISOWeek(now);
    const currentYear = getISOWeekYear(now);
    const tasksToRoll = tasks.filter((t) => selectedIds.has(t.id));

    const inserts = tasksToRoll.map((t, i) => ({
      household_id: household.id,
      created_by: t.created_by,
      assigned_to: t.assigned_to,
      category_id: t.category_id,
      title: t.title,
      notes: t.notes,
      assignee_type: t.assignee_type,
      is_done: false,
      week_number: currentWeek,
      year: currentYear,
      sort_order: i,
      rolled_over_from: t.id,
    }));

    const { error: insertError } = await supabase.from("tasks").insert(inserts);
    if (insertError) {
      toast.error("Failed to roll over tasks. Please try again.");
      setIsConfirming(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("households")
      .update({
        rollover_confirmed: true,
        confirmed_week: currentWeek,
        confirmed_year: currentYear,
      })
      .eq("id", household.id);

    if (updateError) {
      toast.error("Rollover confirmed but failed to update status.");
      setIsConfirming(false);
      return;
    }

    setConfirmed(true);
    toast.success(`${inserts.length} tasks rolled over to next week`);
    setIsConfirming(false);

    setTimeout(() => {
      router.push("/board");
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (confirmed) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <CardTitle>Rollover Confirmed</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          Redirecting to the board...
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    const handleDismiss = async () => {
      const now = new Date();
      await supabase
        .from("households")
        .update({
          rollover_confirmed: true,
          confirmed_week: getISOWeek(now),
          confirmed_year: getISOWeekYear(now),
        })
        .eq("id", household!.id);
      router.push("/board");
    };

    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>No tasks to roll over</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            All tasks from last week are complete. Nothing to roll over.
          </p>
          <Button className="w-full" onClick={handleDismiss}>
            Go to Board
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Weekly Rollover</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select which unfinished tasks to carry over to the current week.
        </p>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50 cursor-pointer transition-colors"
            onClick={() => toggleSelection(task.id)}
          >
            <Checkbox
              checked={selectedIds.has(task.id)}
              onCheckedChange={() => toggleSelection(task.id)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{task.title}</p>
              {task.category && (
                <span className="text-[10px] text-muted-foreground">
                  {task.category.emoji} {task.category.name}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={handleConfirm}
        disabled={isConfirming || selectedIds.size === 0}
      >
        {isConfirming ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        Confirm Rollover ({selectedIds.size} task{selectedIds.size !== 1 ? "s" : ""})
      </Button>
    </div>
  );
}
