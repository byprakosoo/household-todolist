"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { TaskCategory } from "@/types";

export function useCategories() {
  const { household, supabase, isLoading: isAuthLoading } = useAuth();
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!household) {
      setIsLoading(isAuthLoading);
      if (isAuthLoading) return;
      setCategories([]);
      return;
    }
    const { data } = await supabase
      .from("task_categories")
      .select("*")
      .eq("household_id", household.id)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    setCategories((data as TaskCategory[]) || []);
    setIsLoading(false);
  }, [household, isAuthLoading, supabase]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = useCallback(async (cat: { name: string; color_hex: string; emoji: string | null }) => {
    if (!household) return;
    const { error } = await supabase.from("task_categories").insert({
      household_id: household.id,
      name: cat.name,
      color_hex: cat.color_hex,
      emoji: cat.emoji,
      sort_order: categories.length,
    });
    if (error) throw error;
    await fetchCategories();
  }, [categories.length, fetchCategories, household, supabase]);

  const updateCategory = useCallback(async (id: string, updates: Partial<TaskCategory>) => {
    const { error } = await supabase.from("task_categories").update(updates).eq("id", id);
    if (error) throw error;
    await fetchCategories();
  }, [fetchCategories, supabase]);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase.from("task_categories").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    await fetchCategories();
  }, [fetchCategories, supabase]);

  return { categories, isLoading, createCategory, updateCategory, deleteCategory, refetch: fetchCategories };
}
