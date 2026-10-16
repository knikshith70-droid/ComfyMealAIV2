import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { fetchProfile, upsertProfile } from "./api";
import { useI18n, type Lang } from "./i18n";
import type { Profile } from "./supabase";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  ensureProfileRow: (userId: string) => Promise<Profile>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setLang } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // Prevent a slow profile request for a previous account from overwriting
  // the profile belonging to the current account.
  const profileLoadVersion = useRef(0);

  const loadProfile = async (u: User, version: number) => {
    try {
      let p = await fetchProfile(u.id);
      if (!p) {
        p = await upsertProfile({
          id: u.id,
          allergies: [],
          lifestyle: [],
          cuisines: [],
          adults: 1,
          children: 0,
          goals: [],
          cuisine_theme: [],
          comfort_style: [],
          adventure_level: [],
          cooking_skill: [],
          meal_occasion: [],
          flavor_profile: [],
          onboarded: false,
          language: "en",
        });
      }
      if (version !== profileLoadVersion.current) return;
      setProfile(p);
      if (p?.language) setLang(p.language as Lang);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to load profile", e);
      if (version === profileLoadVersion.current) setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Ignore passive token refreshes; only handle explicit auth transitions.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event !== "INITIAL_SESSION" && event !== "SIGNED_IN" && event !== "SIGNED_OUT") {
        return;
      }

      const u = session?.user ?? null;
      const version = ++profileLoadVersion.current;
      setUser(u);
      // Clear the previous profile immediately so it cannot be rendered for
      // the newly signed-in account while its own profile is loading.
      setProfile(null);

      if (u) {
        void loadProfile(u, version).finally(() => {
          if (event === "INITIAL_SESSION" && mounted) setLoading(false);
        });
      } else if (event === "INITIAL_SESSION" && mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      profileLoadVersion.current++;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    profileLoadVersion.current++;
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!user) return;
    const version = ++profileLoadVersion.current;
    await loadProfile(user, version);
  };

  const ensureProfileRow = async (userId: string): Promise<Profile> => {
    const version = ++profileLoadVersion.current;
    const existing = await fetchProfile(userId);
    let result = existing;
    if (!result) {
      result = await upsertProfile({
        id: userId,
        allergies: [],
        lifestyle: [],
        cuisines: [],
        adults: 1,
        children: 0,
        goals: [],
        cuisine_theme: [],
        comfort_style: [],
        adventure_level: [],
        cooking_skill: [],
        meal_occasion: [],
        flavor_profile: [],
        onboarded: false,
        language: "en",
      });
    }

    // A caller may finish after the user has switched accounts. Return the
    // requested row to the caller, but never install it as the active profile.
    if (version === profileLoadVersion.current) {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.id === userId) {
        setProfile(result);
        if (result.language) setLang(result.language as Lang);
      }
    }
    return result;
  };

  const value = useMemo<AuthState>(
    () => ({ user, profile, loading, signOut, refreshProfile, ensureProfileRow }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
