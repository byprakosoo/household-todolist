"use client";

import { useMemo, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTasks } from "@/hooks/use-tasks";
import { useCategories } from "@/hooks/use-categories";
import { TaskCard } from "./task-card";
import { CategoryFilter } from "./category-filter";
import { Loader2 } from "lucide-react";

interface TaskListProps {
  week_number: number;
  year: number;
}

export function TaskList({ week_number, year }: TaskListProps) {
  const { partner } = useAuth();
  const { tasks, isLoading, updateTask, deleteTask } = useTasks(
    week_number,
    year
  );
  const { categories } = useCategories();
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const filteredTasks = useMemo(() => {
    if (activeFilters.length === 0) return tasks;
    return tasks.filter((t) => t.category_id && activeFilters.includes(t.category_id));
  }, [tasks, activeFilters]);

  const toggleFilter = useCallback((categoryId: string) => {
    setActiveFilters((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  }, []);

  const handleToggle = useCallback(
    async (id: string, is_done: boolean) => {
      await updateTask(id, {
        is_done,
        completed_at: is_done ? new Date().toISOString() : null,
      });
    },
    [updateTask]
  );

  const completed = tasks.filter((t) => t.is_done);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CategoryFilter
        categories={categories}
        activeFilters={activeFilters}
        onToggle={toggleFilter}
      />

      {tasks.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {completed.length}/{tasks.length} completed
        </div>
      )}

      <div className="space-y-2">
        {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggle={handleToggle}
            onUpdate={updateTask}
            onDelete={deleteTask}
            partnerName={partner?.display_name || "Partner"}
          />
        ))}
      </div>

      {!isLoading && tasks.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl">📝</div>
          <p className="text-muted-foreground font-medium">No tasks yet this week</p>
          <p className="text-sm text-muted-foreground">Tap the + button to add a task.</p>
        </div>
      )}

      {activeFilters.length > 0 && filteredTasks.length === 0 && tasks.length > 0 && (
        <div className="text-center py-8 space-y-2">
          <p className="text-sm text-muted-foreground">
            No tasks match the selected filters.
          </p>
        </div>
      )}
    </div>
  );
}
