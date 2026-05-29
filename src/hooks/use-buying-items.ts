"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { BuyingItem, User } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

const USER_1_ID = "20000000-0000-0000-0000-000000000001";
const USER_2_ID = "20000000-0000-0000-0000-000000000002";
const BUYING_ITEM_SELECT = "*";

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

function mapBuyingItem(row: Record<string, unknown>): BuyingItem {
  return {
    ...row,
    creator: resolveUser(row.created_by as string | null),
  } as BuyingItem;
}

function sortBuyingItems(items: BuyingItem[]) {
  return [...items].sort((a, b) => {
    if (a.is_bought !== b.is_bought) return a.is_bought ? 1 : -1;
    if (a.is_bought && b.is_bought) {
      const aTime = a.bought_at ? new Date(a.bought_at).getTime() : 0;
      const bTime = b.bought_at ? new Date(b.bought_at).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
    }
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export function useBuyingItems() {
  const { household, user, supabase, isLoading: isAuthLoading } = useAuth();
  const [items, setItems] = useState<BuyingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchItemsRef = useRef<() => Promise<void>>();
  const fetchSeqRef = useRef(0);
  const localChangeIdsRef = useRef<Map<string, number>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);

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

  const fetchItems = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    if (!household) {
      setIsLoading(isAuthLoading);
      if (isAuthLoading) return;
      setItems([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("buying_items")
        .select(BUYING_ITEM_SELECT)
        .eq("household_id", household.id)
        .order("is_bought", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (seq !== fetchSeqRef.current) return;

      setItems(sortBuyingItems(((data as Array<Record<string, unknown>>) || []).map(mapBuyingItem)));
    } catch {
      if (seq === fetchSeqRef.current) setItems([]);
    } finally {
      if (seq === fetchSeqRef.current) setIsLoading(false);
    }
  }, [household, isAuthLoading, supabase]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  fetchItemsRef.current = fetchItems;

  useEffect(() => {
    if (!household) return;

    const channel = supabase
      .channel(`buying-items-${household.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "buying_items",
          filter: `household_id=eq.${household.id}`,
        },
        (payload) => {
          const row = (payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old) as { id?: string } | null;
          if (consumeLocalChange(row?.id)) return;
          fetchItemsRef.current?.();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consumeLocalChange, household, supabase]);

  const createItem = useCallback(async (item: { name: string; quantity?: string | null }) => {
    if (!household) throw new Error("Household not loaded. Please wait a moment and try again.");
    if (!user) throw new Error("User not available.");

    const { data: latest } = await supabase
      .from("buying_items")
      .select("sort_order")
      .eq("household_id", household.id)
      .eq("is_bought", false)
      .order("sort_order", { ascending: false })
      .limit(1);

    const newOrder = (latest?.[0]?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("buying_items")
      .insert({
        household_id: household.id,
        created_by: user.id,
        name: item.name,
        quantity: item.quantity || null,
        sort_order: newOrder,
        is_bought: false,
      })
      .select(BUYING_ITEM_SELECT)
      .single();

    if (error) throw error;
    if (data) {
      const created = mapBuyingItem(data as Record<string, unknown>);
      markLocalChange(created.id);
      setItems((prev) => sortBuyingItems([...prev, created]));
    }
  }, [household, markLocalChange, supabase, user]);

  const updateItem = useCallback(async (id: string, updates: Partial<BuyingItem>) => {
    const { data, error } = await supabase
      .from("buying_items")
      .update(updates)
      .eq("id", id)
      .select(BUYING_ITEM_SELECT)
      .single();

    if (error) throw error;
    markLocalChange(id);
    setItems((prev) =>
      sortBuyingItems(
        prev.map((item) =>
          item.id === id
            ? data
              ? mapBuyingItem(data as Record<string, unknown>)
              : ({ ...item, ...updates } as BuyingItem)
            : item
        )
      )
    );
  }, [markLocalChange, supabase]);

  const setItemBought = useCallback(async (id: string, is_bought: boolean) => {
    await updateItem(id, {
      is_bought,
      bought_at: is_bought ? new Date().toISOString() : null,
    });
  }, [updateItem]);

  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase.from("buying_items").delete().eq("id", id);
    if (error) throw error;
    markLocalChange(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, [markLocalChange, supabase]);

  const clearBought = useCallback(async () => {
    if (!household) throw new Error("Household not loaded. Please wait a moment and try again.");
    const boughtIds = items.filter((item) => item.is_bought).map((item) => item.id);
    if (boughtIds.length === 0) return;

    const { error } = await supabase
      .from("buying_items")
      .delete()
      .eq("household_id", household.id)
      .eq("is_bought", true);

    if (error) throw error;
    boughtIds.forEach(markLocalChange);
    setItems((prev) => prev.filter((item) => !item.is_bought));
  }, [household, items, markLocalChange, supabase]);

  return {
    items,
    isLoading,
    createItem,
    updateItem,
    setItemBought,
    deleteItem,
    clearBought,
    refetch: fetchItems,
  };
}
