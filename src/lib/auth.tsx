import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "colaborador" | "tecnico";
type AuthState = { user: User | null; role: Role | null; name: string; loading: boolean };

const AuthContext = createContext<AuthState>({ user: null, role: null, name: "", loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, role: null, name: "", loading: true });

  useEffect(() => {
    let active = true;
    async function load(user: User | null) {
      if (!user) {
        if (active) setState({ user: null, role: null, name: "", loading: false });
        return;
      }
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      ]);
      const role: Role = roles?.some((r) => r.role === "tecnico") ? "tecnico" : "colaborador";
      if (active) setState({ user, role, name: profile?.full_name ?? user.email ?? "", loading: false });
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setTimeout(() => void load(session?.user ?? null), 0);
    });
    void supabase.auth.getUser().then(({ data }) => load(data.user));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
