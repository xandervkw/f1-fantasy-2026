import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Race, Driver, DriverAssignment, Result, Score } from "@/types";

export interface AssignmentWithDriver extends DriverAssignment {
  driver: Driver;
}

export interface GridEntry {
  user_id: string;
  display_name: string;
  driver_name: string;
  driver_team: string;
}

export interface CurrentRaceData {
  race: Race | null;
  assignment: AssignmentWithDriver | null;
  result: Result | null;
  score: Score | null;
  raceGrid: GridEntry[];
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
  const [raceGrid, setRaceGrid] = useState<GridEntry[]>([]);
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
        setRaceGrid([]);
        setLoading(false);
        return;
      }

      // 2. Parallel-fetch assignment, result, score, and race grid
      const [assignmentRes, resultRes, scoreRes, allAssignmentsRes, membersRes] =
        await Promise.all([
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

          // All assignments for this race (race grid)
          supabase
            .from("driver_assignments")
            .select("user_id, drivers(full_name, team)")
            .eq("competition_id", competitionId)
            .eq("race_id", currentRace.id),

          // All competition members with display names
          supabase
            .from("competition_members")
            .select("user_id, profiles(display_name)")
            .eq("competition_id", competitionId),
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

      // Build race grid from all assignments + member names
      if (allAssignmentsRes.data && membersRes.data) {
        const memberMap = new Map<string, string>();
        for (const m of membersRes.data as any[]) {
          const name = m.profiles?.display_name ?? "Unknown";
          memberMap.set(m.user_id, name);
        }
        const grid: GridEntry[] = (allAssignmentsRes.data as any[])
          .map((a) => ({
            user_id: a.user_id as string,
            display_name: memberMap.get(a.user_id) ?? "Unknown",
            driver_name: (a.drivers?.full_name as string) ?? "Unknown",
            driver_team: (a.drivers?.team as string) ?? "Unknown",
          }))
          .sort((a, b) => a.display_name.localeCompare(b.display_name));
        setRaceGrid(grid);
      } else {
        setRaceGrid([]);
      }
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

  return { race, assignment, result, score, raceGrid, loading, error, refetch: fetchData };
}
