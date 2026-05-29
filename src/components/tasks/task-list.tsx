"use client";

import { useMemo, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { TaskCard } from "./task-card";
import { CategoryFilter } from "./category-filter";
import { Loader2, ClipboardList } from "lucide-react";
import type { Task, TaskCategory } from "@/types";

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  categories: TaskCategory[];
  createCategory: (cat: { name: string; color_hex: string; emoji: string | null }) => Promise<void>;
}

export function TaskList({ tasks, isLoading, updateTask, deleteTask, categories, createCategory }: TaskListProps) {
  const { partner } = useAuth();
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

  const completedCount = useMemo(() => tasks.reduce((count, task) => count + (task.is_done ? 1 : 0), 0), [tasks]);

  if (isLoading && tasks.length === 0) {
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

      {isLoading && (
        <div className="flex items-center justify-center py-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}

      {tasks.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.round((completedCount / tasks.length) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium tabular-nums">
            {completedCount}/{tasks.length}
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
            partnerName={partner?.display_name || "Wife"}
            categories={categories}
            createCategory={createCategory}
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
