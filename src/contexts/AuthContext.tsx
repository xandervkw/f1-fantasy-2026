import { createContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Profile, CompetitionMember } from "@/types";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  competitionId: string | null;
  loading: boolean;
  signIn: (redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  joinCompetition: (inviteCode: string) => Promise<{ error: string | null }>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// ---------- helpers (pure functions, no hooks) ----------

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (data) return data as Profile;

  // Retry once after 500 ms (DB trigger may not have finished)
  await new Promise((r) => setTimeout(r, 500));
  const { data: retry } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return (retry as Profile) ?? null;
}

async function loadMembership(userId: string): Promise<CompetitionMember | null> {
  const { data, error } = await supabase
    .from("competition_members")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[Auth] loadMembership error:", error);
    return null;
  }
  return (data as CompetitionMember) ?? null;
}

// ---------- provider ----------

// Module-level setter to allow fire-and-forget data loading
// without blocking the onAuthStateChange callback
let _setProfile: ((p: Profile | null) => void) | null = null;
let _setMembership: ((m: CompetitionMember | null) => void) | null = null;
let _setLoading: ((l: boolean) => void) | null = null;

async function loadUserData(userId: string) {
  try {
    const [p, m] = await Promise.all([
      loadProfile(userId),
      loadMembership(userId),
    ]);
    _setProfile?.(p);
    _setMembership?.(m);
  } catch (err) {
    console.error("[Auth] loadUserData error:", err);
  } finally {
    _setLoading?.(false);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [competitionMembership, setCompetitionMembership] =
    useState<CompetitionMember | null>(null);
  const [loading, setLoading] = useState(true);

  const competitionId = competitionMembership?.competition_id ?? null;

  // Expose setters to the module-level loader
  _setProfile = setProfile;
  _setMembership = setCompetitionMembership;
  _setLoading = setLoading;

  useEffect(() => {
    // onAuthStateChange is the ONLY source of truth.
    // Callback must be synchronous (no await) to avoid blocking getSession().
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (
        (event === "INITIAL_SESSION" || event === "SIGNED_IN") &&
        newSession
      ) {
        setSession(newSession);
        setUser(newSession.user);
        // Fire-and-forget — do NOT await (would deadlock getSession)
        loadUserData(newSession.user.id);
      } else if (event === "INITIAL_SESSION" && !newSession) {
        // No session at all
        setLoading(false);
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        setProfile(null);
        setCompetitionMembership(null);
        setLoading(false);
      } else if (event === "TOKEN_REFRESHED" && newSession) {
        setSession(newSession);
        setUser(newSession.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (redirectTo?: string) => {
    const target = redirectTo || "/dashboard";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + target,
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const joinCompetition = useCallback(
    async (inviteCode: string): Promise<{ error: string | null }> => {
      if (!user) return { error: "Not logged in" };

      const { data: competition, error: lookupError } = await supabase
        .from("competitions")
        .select("id")
        .eq("invite_code", inviteCode.trim().toUpperCase())
        .maybeSingle();

      if (lookupError || !competition) {
        return { error: "Invalid invite code. Please check and try again." };
      }

      const { error: insertError } = await supabase
        .from("competition_members")
        .insert({
          competition_id: competition.id,
          user_id: user.id,
        });

      if (insertError) {
        if (insertError.code === "23505") {
          return { error: "You've already joined this competition." };
        }
        return { error: "Failed to join. Please try again." };
      }

      const membership = await loadMembership(user.id);
      setCompetitionMembership(membership);

      return { error: null };
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        competitionId,
        loading,
        signIn,
        signOut,
        joinCompetition,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
