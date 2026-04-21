import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_ADMIN_EMAILS = ["nicopbenitez84@gmail.com"];

const ADMIN_EMAILS = (() => {
  const fromEnv = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined)
    ?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv && fromEnv.length > 0 ? fromEnv : FALLBACK_ADMIN_EMAILS;
})();

const isAllowedAdmin = (email?: string | null) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

type AdminAuthContextValue = {
  loading: boolean;
  isAdmin: boolean;
  email: string | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AdminAuthContextValue>(() => {
    const email = session?.user?.email ?? null;
    const isAdmin = isAllowedAdmin(email);

    return {
      loading,
      isAdmin,
      email,
      login: async (emailInput, password) => {
        const emailValue = emailInput.trim().toLowerCase();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailValue,
          password,
        });
        if (error) return { error: error.message };

        const allowed = isAllowedAdmin(data.user?.email ?? emailValue);
        if (!allowed) {
          await supabase.auth.signOut();
          return { error: "Ese usuario no tiene permisos de admin." };
        }
        return {};
      },
      logout: async () => {
        await supabase.auth.signOut();
      },
    };
  }, [loading, session]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error("useAdminAuth debe usarse dentro de AdminAuthProvider");
  return context;
};
