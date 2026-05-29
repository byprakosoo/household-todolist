"use client";

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

const HOUSEHOLD_ID = "10000000-0000-0000-0000-000000000001";
const USER_1_ID = "20000000-0000-0000-0000-000000000001";
const USER_2_ID = "20000000-0000-0000-0000-000000000002";

interface AppUser {
  id: string;
  email: string;
  display_name: string;
  avatar_color: string;
}

interface AppHousehold {
  id: string;
  invite_code: string;
  rollover_confirmed: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: AppUser | null;
  household: AppHousehold | null;
  partner: AppUser | null;
  isLoading: boolean;
  supabase: ReturnType<typeof createClient>;
  refreshHousehold: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const HUSBAND_USER: AppUser = {
  id: USER_1_ID,
  email: "husband@household.local",
  display_name: "Husband",
  avatar_color: "#3B82F6",
};

const WIFE_USER: AppUser = {
  id: USER_2_ID,
  email: "wife@household.local",
  display_name: "Wife",
  avatar_color: "#EC4899",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [household, setHousehold] = useState<AppHousehold | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const bootstrapHousehold = useCallback(async () => {
    const { data: hh } = await supabase
      .from("households")
      .select("*")
      .eq("id", HOUSEHOLD_ID)
      .maybeSingle();

    if (hh) {
      setHousehold({
        id: hh.id,
        invite_code: hh.invite_code,
        rollover_confirmed: hh.rollover_confirmed,
      });
      setIsLoading(false);
      return;
    }

    const { error: insertErr } = await supabase.from("households").insert({
      id: HOUSEHOLD_ID,
      invite_code: "WKSYNC",
    });

    if (insertErr) {
      console.error("Failed to create household:", insertErr);
      setIsLoading(false);
      return;
    }

    const { data: created } = await supabase
      .from("households")
      .select("*")
      .eq("id", HOUSEHOLD_ID)
      .single();

    if (created) {
      setHousehold({
        id: created.id,
        invite_code: created.invite_code,
        rollover_confirmed: created.rollover_confirmed,
      });
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    bootstrapHousehold();
  }, [bootstrapHousehold]);

  const refreshHousehold = useCallback(async () => {
    await bootstrapHousehold();
  }, [bootstrapHousehold]);

  return (
    <AuthContext.Provider
      value={{
        session: null,
        user: HUSBAND_USER,
        household,
        partner: WIFE_USER,
        isLoading,
        supabase,
        refreshHousehold,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
