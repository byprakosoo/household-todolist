"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [household, setHousehold] = useState<AppHousehold | null>(null);
  const [partner, setPartner] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const loadHousehold = useCallback(async (userId: string) => {
    try {
      const { data: membership } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!membership) return;

      const { data: hh } = await supabase
        .from("households")
        .select("*")
        .eq("id", membership.household_id)
        .maybeSingle();

      if (hh) {
        setHousehold({ id: hh.id, invite_code: hh.invite_code, rollover_confirmed: hh.rollover_confirmed });

        const { data: members } = await supabase
          .from("household_members")
          .select("user_id")
          .eq("household_id", hh.id);

        const partnerId = members?.find((m) => m.user_id !== userId)?.user_id;
        if (partnerId) {
          const { data: partnerUser } = await supabase
            .from("users")
            .select("*")
            .eq("id", partnerId)
            .maybeSingle();
          if (partnerUser) setPartner(partnerUser);
        }
      }
    } catch {
      // Backend tables not set up yet
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;
    const safety = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 3000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        try {
          const { data: appUser, error: userErr } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

          if (!userErr && appUser) {
            setUser(appUser);
            await loadHousehold(session.user.id);
          }
        } catch {
          // Backend tables not set up yet — still allow the app to render
        }
      }
      if (mounted) setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        try {
          const { data: appUser, error: userErr } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

          if (!userErr && appUser) {
            setUser(appUser);
            await loadHousehold(session.user.id);
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
        setHousehold(null);
        setPartner(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, [supabase, loadHousehold]);

  const refreshHousehold = useCallback(async () => {
    const userId = session?.user?.id;
    if (userId) await loadHousehold(userId);
  }, [session, loadHousehold]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        household,
        partner,
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
