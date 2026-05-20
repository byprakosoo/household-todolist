"use client";

import { useMemo, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCategories } from "@/hooks/use-categories";
import { TaskCard } from "./task-card";
import { CategoryFilter } from "./category-filter";
import { Loader2, ClipboardList } from "lucide-react";
import type { Task } from "@/types";

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export function TaskList({ tasks, isLoading, updateTask, deleteTask }: TaskListProps) {
  const { partner } = useAuth();
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
    <div className="space-y-5">
      <CategoryFilter
        categories={categories}
        activeFilters={activeFilters}
        onToggle={toggleFilter}
      />

      {tasks.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.round((completed.length / tasks.length) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium tabular-nums">
            {completed.length}/{tasks.length}
          </span>
        </div>
      )}

      <div className="space-y-2.5">
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
        <div className="text-center py-20 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50">
            <ClipboardList className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">No tasks yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tap the + button below to add your first task.
            </p>
          </div>
        </div>
      )}

      {activeFilters.length > 0 && filteredTasks.length === 0 && tasks.length > 0 && (
        <div className="text-center py-12 space-y-2">
          <p className="text-sm text-muted-foreground">
            No tasks match the selected filters.
          </p>
        </div>
      )}
    </div>
  );
}
