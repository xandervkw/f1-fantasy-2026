import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Race, Driver, DriverAssignment, Result, Score } from "@/types";

export interface AssignmentWithDriver extends DriverAssignment {
  driver: Driver;
}

export interface CurrentRaceData {
  race: Race | null;
  assignment: AssignmentWithDriver | null;
  result: Result | null;
  score: Score | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch the current/next race and related data for the dashboard.
 *
 * Priority: active race > first upcoming race by round_number.
 * Also fetches:
 *  - The user's driver assignment (with driver details) for that race
 *  - The race result for the assigned driver (if race completed)
 *  - The user's score for that race (if race completed)
 *
 * Only queries the single current race's assignment (driver reveal rule).
 */
export function useCurrentRace(): CurrentRaceData {
  const { user, competitionId } = useAuth();

  const [race, setRace] = useState<Race | null>(null);
  const [assignment, setAssignment] = useState<AssignmentWithDriver | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user || !competitionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Find the current race: active first, then first upcoming
      let currentRace: Race | null = null;

      const { data: activeRace, error: activeErr } = await supabase
        .from("races")
        .select("*")
        .eq("season", 2026)
        .eq("status", "active")
        .order("round_number", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (activeErr) throw new Error(activeErr.message);

      if (activeRace) {
        currentRace = activeRace as Race;
      } else {
        const { data: upcomingRace, error: upcomingErr } = await supabase
          .from("races")
          .select("*")
          .eq("season", 2026)
          .eq("status", "upcoming")
          .order("round_number", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (upcomingErr) throw new Error(upcomingErr.message);
        currentRace = (upcomingRace as Race) ?? null;
      }

      setRace(currentRace);

      if (!currentRace) {
        // No active or upcoming race — season complete or not started
        setAssignment(null);
        setResult(null);
        setScore(null);
        setLoading(false);
        return;
      }

      // 2. Parallel-fetch assignment, result, and score
      const [assignmentRes, resultRes, scoreRes] = await Promise.all([
        // Assignment with driver join (only for current race — driver reveal rule)
        supabase
          .from("driver_assignments")
          .select("*, driver:drivers(*)")
          .eq("competition_id", competitionId)
          .eq("race_id", currentRace.id)
          .eq("user_id", user.id)
          .maybeSingle(),

        // Result for assigned driver (we don't know driver_id yet, so fetch all for this race)
        currentRace.status === "completed"
          ? supabase
              .from("results")
              .select("*")
              .eq("race_id", currentRace.id)
          : Promise.resolve({ data: null, error: null }),

        // User's score for this race
        currentRace.status === "completed"
          ? supabase
              .from("scores")
              .select("*")
              .eq("user_id", user.id)
              .eq("race_id", currentRace.id)
              .eq("competition_id", competitionId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (assignmentRes.error) throw new Error(assignmentRes.error.message);

      const assignmentData = assignmentRes.data as AssignmentWithDriver | null;
      setAssignment(assignmentData);

      // Find the result for the user's assigned driver specifically
      if (assignmentData && resultRes.data && Array.isArray(resultRes.data)) {
        const driverResult = (resultRes.data as Result[]).find(
          (r) => r.driver_id === assignmentData.driver_id
        );
        setResult(driverResult ?? null);
      } else {
        setResult(null);
      }

      setScore((scoreRes.data as Score) ?? null);
    } catch (err) {
      console.error("[useCurrentRace] error:", err);
      setError(err instanceof Error ? err.message : "Failed to load race data");
    } finally {
      setLoading(false);
    }
  }, [user, competitionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { race, assignment, result, score, loading, error, refetch: fetchData };
}
