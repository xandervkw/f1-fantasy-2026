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

      // 1. Look up competition by invite code
      const { data: competition, error: lookupError } = await supabase
        .from("competitions")
        .select("id, accepting_members")
        .eq("invite_code", inviteCode.trim().toUpperCase())
        .maybeSingle();

      if (lookupError || !competition) {
        return { error: "Invalid invite code. Please check and try again." };
      }

      // 2. Check if competition is accepting new members
      if (!competition.accepting_members) {
        return {
          error: "This competition is no longer accepting new members.",
        };
      }

      // 3. Check 22-member cap
      const { count: memberCount } = await supabase
        .from("competition_members")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", competition.id);

      if (memberCount != null && memberCount >= 22) {
        return { error: "This competition is full (22/22 players)." };
      }

      // 4. Insert membership
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
        // RLS violation when competition is closed
        if (insertError.code === "42501") {
          return {
            error: "This competition is no longer accepting new members.",
          };
        }
        return { error: "Failed to join. Please try again." };
      }

      // 5. If driver assignments already exist, auto-generate for the late-joiner
      const { count: assignmentCount } = await supabase
        .from("driver_assignments")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", competition.id);

      if (assignmentCount && assignmentCount > 0) {
        const { error: rpcError } = await supabase.rpc("assign_late_joiner", {
          p_competition_id: competition.id,
          p_user_id: user.id,
        });
        if (rpcError) {
          console.error(
            "[Auth] assign_late_joiner error:",
            rpcError.message
          );
          // Non-fatal — they joined but may need manual assignment
        }
      }

      // 6. Reload membership state
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
