import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Race } from "@/types";

// ---------- types ----------

export interface HistoryScoreRow {
  raceId: string;
  roundNumber: number;
  raceName: string;
  isSprintWeekend: boolean;
  userId: string;
  displayName: string;
  driverName: string;
  driverAbbreviation: string;
  predictedPosition: number | null;
  actualPosition: number | null;
  isDnf: boolean;
  positionOff: number | null;
  racePoints: number;
  sprintPredicted: number | null;
  sprintActual: number | null;
  sprintDnf: boolean;
  sprintPositionOff: number | null;
  sprintPoints: number;
  totalPoints: number;
}

export interface HistoryMember {
  userId: string;
  displayName: string;
}

// ---------- raw DB row types ----------

interface RawScore {
  user_id: string;
  race_id: string;
  race_points: number;
  sprint_points: number;
  total_points: number;
  race_position_off: number | null;
  sprint_position_off: number | null;
}

interface RawPrediction {
  user_id: string;
  race_id: string;
  predicted_position_race: number | null;
  predicted_position_sprint: number | null;
}

interface RawAssignment {
  user_id: string;
  race_id: string;
  driver_id: string;
}

interface RawResult {
  race_id: string;
  driver_id: string;
  finish_position_race: number | null;
  finish_position_sprint: number | null;
  is_dnf_race: boolean;
  is_dnf_sprint: boolean;
}

interface RawDriver {
  id: string;
  full_name: string;
  abbreviation: string;
}

interface RawMember {
  user_id: string;
  profile: { display_name: string } | null;
}

// ---------- hook ----------

export function useHistory(competitionId: string | null) {
  const [races, setRaces] = useState<Race[]>([]);
  const [members, setMembers] = useState<HistoryMember[]>([]);
  const [rawScores, setRawScores] = useState<RawScore[]>([]);
  const [rawPredictions, setRawPredictions] = useState<RawPrediction[]>([]);
  const [rawAssignments, setRawAssignments] = useState<RawAssignment[]>([]);
  const [rawResults, setRawResults] = useState<RawResult[]>([]);
  const [rawDrivers, setRawDrivers] = useState<RawDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!competitionId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [
        racesRes,
        scoresRes,
        predictionsRes,
        assignmentsRes,
        resultsRes,
        driversRes,
        membersRes,
      ] = await Promise.all([
        // 1. Completed races
        supabase
          .from("races")
          .select("*")
          .eq("status", "completed")
          .eq("season", 2026)
          .order("round_number", { ascending: true }),

        // 2. All scores for this competition
        supabase
          .from("scores")
          .select(
            "user_id, race_id, race_points, sprint_points, total_points, race_position_off, sprint_position_off"
          )
          .eq("competition_id", competitionId),

        // 3. All predictions for this competition
        supabase
          .from("predictions")
          .select(
            "user_id, race_id, predicted_position_race, predicted_position_sprint"
          )
          .eq("competition_id", competitionId),

        // 4. All driver assignments for this competition
        supabase
          .from("driver_assignments")
          .select("user_id, race_id, driver_id")
          .eq("competition_id", competitionId),

        // 5. All results (not filtered by competition — results are global)
        supabase
          .from("results")
          .select(
            "race_id, driver_id, finish_position_race, finish_position_sprint, is_dnf_race, is_dnf_sprint"
          ),

        // 6. All drivers
        supabase.from("drivers").select("id, full_name, abbreviation"),

        // 7. Competition members with profiles
        supabase
          .from("competition_members")
          .select("user_id, profile:profiles(display_name)")
          .eq("competition_id", competitionId),
      ]);

      if (racesRes.error) throw racesRes.error;
      if (scoresRes.error) throw scoresRes.error;
      if (predictionsRes.error) throw predictionsRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;
      if (resultsRes.error) throw resultsRes.error;
      if (driversRes.error) throw driversRes.error;
      if (membersRes.error) throw membersRes.error;

      setRaces(racesRes.data as Race[]);
      setRawScores(scoresRes.data as RawScore[]);
      setRawPredictions(predictionsRes.data as RawPrediction[]);
      setRawAssignments(assignmentsRes.data as RawAssignment[]);
      setRawResults(resultsRes.data as RawResult[]);
      setRawDrivers(driversRes.data as RawDriver[]);

      const memberRows = membersRes.data as unknown as RawMember[];
      setMembers(
        memberRows
          .map((m) => ({
            userId: m.user_id,
            displayName:
              (m.profile as { display_name: string } | null)?.display_name ??
              "Unknown",
          }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
      );

      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("useHistory fetch error:", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build the merged HistoryScoreRow[] from raw data
  const scores: HistoryScoreRow[] = useMemo(() => {
    if (rawScores.length === 0) return [];

    // Build lookup maps
    const raceMap = new Map(races.map((r) => [r.id, r]));
    const driverMap = new Map(rawDrivers.map((d) => [d.id, d]));

    // Predictions keyed by "userId:raceId"
    const predictionMap = new Map(
      rawPredictions.map((p) => [`${p.user_id}:${p.race_id}`, p])
    );

    // Assignments keyed by "userId:raceId"
    const assignmentMap = new Map(
      rawAssignments.map((a) => [`${a.user_id}:${a.race_id}`, a])
    );

    // Results keyed by "driverId:raceId"
    const resultMap = new Map(
      rawResults.map((r) => [`${r.driver_id}:${r.race_id}`, r])
    );

    // Member display names by userId
    const memberNameMap = new Map(
      members.map((m) => [m.userId, m.displayName])
    );

    return rawScores.map((s) => {
      const key = `${s.user_id}:${s.race_id}`;
      const race = raceMap.get(s.race_id);
      const prediction = predictionMap.get(key);
      const assignment = assignmentMap.get(key);
      const driver = assignment ? driverMap.get(assignment.driver_id) : null;
      const result = assignment
        ? resultMap.get(`${assignment.driver_id}:${s.race_id}`)
        : null;

      return {
        raceId: s.race_id,
        roundNumber: race?.round_number ?? 0,
        raceName: race?.race_name ?? "Unknown",
        isSprintWeekend: race?.is_sprint_weekend ?? false,
        userId: s.user_id,
        displayName: memberNameMap.get(s.user_id) ?? "Unknown",
        driverName: driver?.full_name ?? "Unknown",
        driverAbbreviation: driver?.abbreviation ?? "???",
        predictedPosition: prediction?.predicted_position_race ?? null,
        actualPosition: result?.finish_position_race ?? null,
        isDnf: result?.is_dnf_race ?? false,
        positionOff: s.race_position_off,
        racePoints: s.race_points,
        sprintPredicted: prediction?.predicted_position_sprint ?? null,
        sprintActual: result?.finish_position_sprint ?? null,
        sprintDnf: result?.is_dnf_sprint ?? false,
        sprintPositionOff: s.sprint_position_off,
        sprintPoints: s.sprint_points,
        totalPoints: s.total_points,
      };
    });
  }, [rawScores, rawPredictions, rawAssignments, rawResults, rawDrivers, races, members]);

  return { races, members, scores, loading, error, refetch: fetchData };
}
