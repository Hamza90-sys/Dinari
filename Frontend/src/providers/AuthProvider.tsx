import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { authService } from "@/services/auth.service";
import type { Profile } from "@/types/domain";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncProfile = async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null);
      return;
    }

    const nextProfile = await authService.getProfile(nextUser.id);
    setProfile(nextProfile);
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const initialSession = await authService.getSession();
        if (!mounted) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        await syncProfile(initialSession?.user ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    bootstrap();

    const { data: subscription } = authService.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      await syncProfile(nextSession?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      loading,
      isAuthenticated: !!user,
      isAdmin: profile?.role === "admin",
      signIn: async (email, password) => {
        await authService.signIn({ email, password });
      },
      signUp: async (email, password, fullName) => {
        await authService.signUp({ email, password, fullName });
      },
      signOut: async () => {
        await authService.signOut();
      },
      refreshProfile: async () => {
        await syncProfile(user);
      },
    }),
    [loading, profile, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}