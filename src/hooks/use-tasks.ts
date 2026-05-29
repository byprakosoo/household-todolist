"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { Task, User } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

const USER_1_ID = "20000000-0000-0000-0000-000000000001";
const USER_2_ID = "20000000-0000-0000-0000-000000000002";
const TASK_SELECT = "*, category:task_categories(*)";

const USER_1: User = {
  id: USER_1_ID,
  email: "husband@household.local",
  display_name: "Husband",
  avatar_color: "#3B82F6",
  created_at: new Date().toISOString(),
};

const USER_2: User = {
  id: USER_2_ID,
  email: "wife@household.local",
  display_name: "Wife",
  avatar_color: "#EC4899",
  created_at: new Date().toISOString(),
};

function resolveUser(id: string | null): User | null {
  if (id === USER_1_ID) return USER_1;
  if (id === USER_2_ID) return USER_2;
  return null;
}

function mapTask(row: Record<string, unknown>): Task {
  return {
    ...row,
    creator: resolveUser(row.created_by as string | null),
    assignee: resolveUser(row.assigned_to as string | null),
  } as Task;
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export function useTasks(week_number: number, year: number) {
  const { household, user, supabase, isLoading: isAuthLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fetchTasksRef = useRef<() => Promise<void>>();
  const fetchSeqRef = useRef(0);
  const localChangeIdsRef = useRef<Map<string, number>>(new Map());

  const markLocalChange = useCallback((id: string) => {
    localChangeIdsRef.current.set(id, Date.now());
  }, []);

  const consumeLocalChange = useCallback((id: string | undefined) => {
    if (!id) return false;
    const changedAt = localChangeIdsRef.current.get(id);
    if (!changedAt) return false;
    localChangeIdsRef.current.delete(id);
    return Date.now() - changedAt < 10_000;
  }, []);

  const fetchTasks = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    if (!household) {
      setIsLoading(isAuthLoading);
      if (isAuthLoading) return;
      setTasks([]);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_SELECT)
        .eq("household_id", household.id)
        .eq("week_number", week_number)
        .eq("year", year)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;

      if (seq !== fetchSeqRef.current) return;

      const mapped = ((data as Array<Record<string, unknown>>) || []).map(mapTask);
      setTasks(mapped);
    } catch {
      if (seq === fetchSeqRef.current) setTasks([]);
    } finally {
      if (seq === fetchSeqRef.current) setIsLoading(false);
    }
  }, [household, isAuthLoading, supabase, week_number, year]);

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
          filter: `household_id=eq.${household.id} and week_number=eq.${week_number} and year=eq.${year}`,
        },
        (payload) => {
          const row = (payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old) as { id?: string } | null;
          if (consumeLocalChange(row?.id)) return;
          fetchTasksRef.current?.();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consumeLocalChange, household?.id, supabase, week_number, year]);

  const createTask = useCallback(async (task: {
    title: string;
    assignee_type: Task["assignee_type"];
    category_id?: string | null;
    notes?: string | null;
  }) => {
    if (!household) throw new Error("Household not loaded. Please wait a moment and try again.");
    if (!user) throw new Error("User not available.");
    const { data: tasksList } = await supabase
      .from("tasks")
      .select("sort_order")
      .eq("household_id", household.id)
      .eq("week_number", week_number)
      .eq("year", year)
      .order("sort_order", { ascending: false })
      .limit(1);

    const newOrder = (tasksList?.[0]?.sort_order ?? -1) + 1;

    const assignedTo =
      task.assignee_type === "me"
        ? user.id
        : task.assignee_type === "partner"
        ? USER_2_ID
        : null;

    const { data, error } = await supabase.from("tasks").insert({
      household_id: household.id,
      created_by: user.id,
      assigned_to: assignedTo,
      title: task.title,
      assignee_type: task.assignee_type,
      category_id: task.category_id || null,
      notes: task.notes || null,
      week_number,
      year,
      sort_order: newOrder,
      is_done: false,
    }).select(TASK_SELECT).single();

    if (error) throw error;
    if (data) {
      const created = mapTask(data as Record<string, unknown>);
      markLocalChange(created.id);
      setTasks((prev) => sortTasks([...prev, created]));
    }
  }, [household, markLocalChange, supabase, user, week_number, year]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select(TASK_SELECT)
      .single();
    if (error) throw error;
    markLocalChange(id);
    setTasks((prev) =>
      sortTasks(
        prev.map((task) =>
          task.id === id
            ? data
              ? mapTask(data as Record<string, unknown>)
              : ({ ...task, ...updates } as Task)
            : task
        )
      )
    );
  }, [markLocalChange, supabase]);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
    markLocalChange(id);
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, [markLocalChange, supabase]);

  const reorderTasks = useCallback(async (orderedIds: string[]) => {
    const updates = orderedIds.map((id, index) => ({
      id,
      sort_order: index,
    }));
    const { error } = await supabase
      .from("tasks")
      .upsert(updates as Task[]);
    if (error) throw error;
    orderedIds.forEach(markLocalChange);
    const orderById = new Map(orderedIds.map((id, index) => [id, index]));
    setTasks((prev) =>
      sortTasks(
        prev.map((task) => ({
          ...task,
          sort_order: orderById.get(task.id) ?? task.sort_order,
        }))
      )
    );
  }, [markLocalChange, supabase]);

  return { tasks, isLoading, createTask, updateTask, deleteTask, reorderTasks, refetch: fetchTasks };
}
