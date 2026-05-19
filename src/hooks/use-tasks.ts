"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { Task } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useTasks(week_number: number, year: number) {
  const { household, supabase } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fetchTasksRef = useRef<() => Promise<void>>();

  const fetchTasks = useCallback(async () => {
    if (!household) {
      setTasks([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*, category:task_categories(*), creator:users!created_by(*), assignee:users!assigned_to(*)")
      .eq("household_id", household.id)
      .eq("week_number", week_number)
      .eq("year", year)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setTasks((data as Task[]) || []);
    setIsLoading(false);
  }, [household, supabase, week_number, year]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  fetchTasksRef.current = fetchTasks;

  useEffect(() => {
    if (!household) return;
    const channel = supabase
      .channel(`tasks-${household.id}-${week_number}-${year}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `household_id=eq.${household.id}`,
        },
        () => {
          fetchTasksRef.current?.();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [household?.id, supabase, week_number, year]);

  const createTask = async (task: {
    title: string;
    assignee_type: Task["assignee_type"];
    category_id?: string | null;
    notes?: string | null;
  }) => {
    if (!household || !supabase) return;
    const { data: authUser } = await supabase.auth.getUser();
    const { data: tasksList } = await supabase
      .from("tasks")
      .select("sort_order")
      .eq("household_id", household.id)
      .eq("week_number", week_number)
      .eq("year", year)
      .order("sort_order", { ascending: false })
      .limit(1);

    const newOrder = (tasksList?.[0]?.sort_order ?? -1) + 1;

    const { error } = await supabase.from("tasks").insert({
      household_id: household.id,
      created_by: authUser.user?.id,
      assigned_to: task.assignee_type === "both" ? null : task.assignee_type === "me" ? authUser.user?.id : null,
      title: task.title,
      assignee_type: task.assignee_type,
      category_id: task.category_id || null,
      notes: task.notes || null,
      week_number,
      year,
      sort_order: newOrder,
      is_done: false,
    });

    if (error) throw error;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const { error } = await supabase.from("tasks").update(updates).eq("id", id);
    if (error) throw error;
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
  };

  const reorderTasks = async (orderedIds: string[]) => {
    const updates = orderedIds.map((id, index) => ({
      id,
      sort_order: index,
    }));
    const { error } = await supabase
      .from("tasks")
      .upsert(updates as Task[]);
    if (error) throw error;
  };

  return { tasks, isLoading, createTask, updateTask, deleteTask, reorderTasks, refetch: fetchTasks };
}
