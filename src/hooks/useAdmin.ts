import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  checkExistingAssignments,
  storeAssignments,
  deleteAssignments,
} from "@/lib/assignments";
import type { Race, Driver } from "@/types";

// ---------- types ----------

export interface MemberInfo {
  user_id: string;
  display_name: string;
}

export interface AssignmentRow {
  user_id: string;
  display_name: string;
  driver_id: string;
  driver_name: string;
  driver_abbreviation: string;
  driver_team: string;
}

export interface ResultInput {
  driver_id: string;
  finish_position_race: number | null;
  finish_position_sprint: number | null;
  is_dnf_race: boolean;
  is_dnf_sprint: boolean;
}

export interface MutationResult {
  success: boolean;
  message: string;
}

export interface UseAdminReturn {
  // Global data
  races: Race[];
  drivers: Driver[];
  members: MemberInfo[];
  assignmentCount: number;

  // Race-specific data
  raceResults: Array<{
    driver_id: string;
    finish_position_race: number | null;
    finish_position_sprint: number | null;
    is_dnf_race: boolean;
    is_dnf_sprint: boolean;
  }>;
  raceAssignments: AssignmentRow[];

  // Loading
  loading: boolean;
  raceLoading: boolean;
  error: string | null;

  // Mutations
  fetchResults: (roundNumber: number) => Promise<MutationResult>;
  saveResults: (
    raceId: string,
    results: ResultInput[]
  ) => Promise<MutationResult>;
  lockPredictions: () => Promise<MutationResult>;
  unlockPredictions: (
    raceId: string,
    competitionId: string,
    type: "race" | "sprint" | "both"
  ) => Promise<MutationResult>;
  updateLockTime: (
    raceId: string,
    field: "prediction_lock_time" | "sprint_prediction_lock_time",
    value: string | null
  ) => Promise<MutationResult>;
  calculateScores: (raceId: string) => Promise<MutationResult>;
  generateAssignments: () => Promise<MutationResult>;
  resetAssignments: () => Promise<MutationResult>;

  // Refetch
  refetch: () => void;
  refetchRaceData: (raceId: string) => void;
}

// ---------- hook ----------

export function useAdmin(
  competitionId: string | null,
  selectedRaceId: string
): UseAdminReturn {
  const [races, setRaces] = useState<Race[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [assignmentCount, setAssignmentCount] = useState(0);

  const [raceResults, setRaceResults] = useState<
    UseAdminReturn["raceResults"]
  >([]);
  const [raceAssignments, setRaceAssignments] = useState<AssignmentRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [raceLoading, setRaceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------- initial load ----------
  const loadGlobalData = useCallback(async () => {
    if (!competitionId) return;
    setLoading(true);
    setError(null);
    try {
      const [racesRes, driversRes, membersRes, aCount] = await Promise.all([
        supabase
          .from("races")
          .select("*")
          .eq("season", 2026)
          .order("round_number"),
        supabase
          .from("drivers")
          .select("*")
          .eq("season", 2026)
          .order("full_name"),
        supabase
          .from("competition_members")
          .select("user_id, profiles(display_name)")
          .eq("competition_id", competitionId),
        checkExistingAssignments(competitionId),
      ]);

      if (racesRes.error) throw racesRes.error;
      if (driversRes.error) throw driversRes.error;
      if (membersRes.error) throw membersRes.error;

      setRaces(racesRes.data as Race[]);
      setDrivers(driversRes.data as Driver[]);
      setMembers(
        (membersRes.data ?? []).map((row: any) => ({
          user_id: row.user_id,
          display_name: row.profiles?.display_name ?? "Unknown",
        }))
      );
      setAssignmentCount(aCount);
    } catch (err: any) {
      console.error("[useAdmin] loadGlobalData error:", err);
      setError(err.message ?? "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    loadGlobalData();
  }, [loadGlobalData]);

  // ---------- race-specific load ----------
  const loadRaceData = useCallback(
    async (raceId: string) => {
      if (!competitionId || !raceId) {
        setRaceResults([]);
        setRaceAssignments([]);
        return;
      }
      setRaceLoading(true);
      try {
        const [resultsRes, assignmentsRes] = await Promise.all([
          supabase.from("results").select("*").eq("race_id", raceId),
          supabase
            .from("driver_assignments")
            .select("user_id, driver_id, drivers(full_name, abbreviation, team)")
            .eq("race_id", raceId)
            .eq("competition_id", competitionId),
        ]);

        if (resultsRes.error) throw resultsRes.error;
        if (assignmentsRes.error) throw assignmentsRes.error;

        setRaceResults(
          (resultsRes.data ?? []).map((r: any) => ({
            driver_id: r.driver_id,
            finish_position_race: r.finish_position_race,
            finish_position_sprint: r.finish_position_sprint,
            is_dnf_race: r.is_dnf_race,
            is_dnf_sprint: r.is_dnf_sprint,
          }))
        );

        // Merge assignment data with member display names
        const memberMap = new Map(
          members.map((m) => [m.user_id, m.display_name])
        );
        setRaceAssignments(
          (assignmentsRes.data ?? []).map((a: any) => ({
            user_id: a.user_id,
            display_name: memberMap.get(a.user_id) ?? "Unknown",
            driver_id: a.driver_id,
            driver_name: a.drivers?.full_name ?? "Unknown",
            driver_abbreviation: a.drivers?.abbreviation ?? "???",
            driver_team: a.drivers?.team ?? "Unknown",
          }))
        );
      } catch (err: any) {
        console.error("[useAdmin] loadRaceData error:", err);
      } finally {
        setRaceLoading(false);
      }
    },
    [competitionId, members]
  );

  useEffect(() => {
    if (selectedRaceId) {
      loadRaceData(selectedRaceId);
    } else {
      setRaceResults([]);
      setRaceAssignments([]);
    }
  }, [selectedRaceId, loadRaceData]);

  // ---------- mutations ----------

  const fetchResults = useCallback(
    async (roundNumber: number): Promise<MutationResult> => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "fetch-results",
          { body: { round_number: roundNumber } }
        );
        if (fnError) {
          return {
            success: false,
            message: fnError.message ?? "Edge function error",
          };
        }
        // Refresh data
        await loadGlobalData();
        if (selectedRaceId) await loadRaceData(selectedRaceId);
        return {
          success: true,
          message:
            data?.message ??
            `Results fetched for round ${roundNumber}. ${data?.results_stored ?? 0} results stored.`,
        };
      } catch (err: any) {
        return { success: false, message: err.message ?? "Failed to fetch results" };
      }
    },
    [loadGlobalData, loadRaceData, selectedRaceId]
  );

  const saveResults = useCallback(
    async (raceId: string, results: ResultInput[]): Promise<MutationResult> => {
      try {
        const rows = results.map((r) => ({
          race_id: raceId,
          driver_id: r.driver_id,
          finish_position_race: r.finish_position_race,
          finish_position_sprint: r.finish_position_sprint,
          is_dnf_race: r.is_dnf_race,
          is_dnf_sprint: r.is_dnf_sprint,
        }));

        const { error: upsertErr } = await supabase
          .from("results")
          .upsert(rows, { onConflict: "race_id,driver_id" });

        if (upsertErr) {
          return { success: false, message: upsertErr.message };
        }

        await loadRaceData(raceId);
        return {
          success: true,
          message: `Saved ${rows.length} result rows.`,
        };
      } catch (err: any) {
        return { success: false, message: err.message ?? "Failed to save results" };
      }
    },
    [loadRaceData]
  );

  const lockPredictions = useCallback(async (): Promise<MutationResult> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "lock-predictions"
      );
      if (fnError) {
        return { success: false, message: fnError.message ?? "Lock failed" };
      }
      const result = data?.result ?? data;
      return {
        success: true,
        message: `Locked: ${result?.race_locked ?? 0} race, ${result?.sprint_locked ?? 0} sprint, ${result?.missed ?? 0} missed.`,
      };
    } catch (err: any) {
      return { success: false, message: err.message ?? "Failed to lock predictions" };
    }
  }, []);

  const unlockPredictions = useCallback(
    async (
      raceId: string,
      cId: string,
      type: "race" | "sprint" | "both"
    ): Promise<MutationResult> => {
      try {
        const updates: Record<string, boolean> = {};
        if (type === "race" || type === "both") updates.is_locked = false;
        if (type === "sprint" || type === "both")
          updates.is_sprint_locked = false;

        const { error: updateErr, count } = await supabase
          .from("predictions")
          .update(updates)
          .eq("race_id", raceId)
          .eq("competition_id", cId);

        if (updateErr) {
          return { success: false, message: updateErr.message };
        }

        return {
          success: true,
          message: `Unlocked ${type} predictions. ${count ?? "?"} rows updated.`,
        };
      } catch (err: any) {
        return {
          success: false,
          message: err.message ?? "Failed to unlock predictions",
        };
      }
    },
    []
  );

  const updateLockTime = useCallback(
    async (
      raceId: string,
      field: "prediction_lock_time" | "sprint_prediction_lock_time",
      value: string | null
    ): Promise<MutationResult> => {
      try {
        const { error: updateErr } = await supabase
          .from("races")
          .update({ [field]: value })
          .eq("id", raceId);

        if (updateErr) {
          return { success: false, message: updateErr.message };
        }

        await loadGlobalData(); // refresh race data
        return {
          success: true,
          message: value
            ? `Custom lock time set.`
            : `Reset to default (5 min before qualifying).`,
        };
      } catch (err: any) {
        return {
          success: false,
          message: err.message ?? "Failed to update lock time",
        };
      }
    },
    [loadGlobalData]
  );

  const calculateScores = useCallback(
    async (raceId: string): Promise<MutationResult> => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "calculate-scores",
          { body: { race_id: raceId } }
        );
        if (fnError) {
          return {
            success: false,
            message: fnError.message ?? "Score calculation failed",
          };
        }
        return {
          success: true,
          message: `Scores calculated. ${data?.scores_upserted ?? data?.count ?? "?"} score rows.`,
        };
      } catch (err: any) {
        return {
          success: false,
          message: err.message ?? "Failed to calculate scores",
        };
      }
    },
    []
  );

  const generateAssignments = useCallback(async (): Promise<MutationResult> => {
    if (!competitionId)
      return { success: false, message: "No competition selected" };
    try {
      const result = await storeAssignments(competitionId);
      await loadGlobalData();
      if (selectedRaceId) await loadRaceData(selectedRaceId);
      return {
        success: true,
        message: `Assignments generated! ${result.inserted} assignments for ${result.playerCount} players across ${result.roundCount} rounds.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message ?? "Failed to generate assignments",
      };
    }
  }, [competitionId, loadGlobalData, loadRaceData, selectedRaceId]);

  const resetAssignments = useCallback(async (): Promise<MutationResult> => {
    if (!competitionId)
      return { success: false, message: "No competition selected" };
    try {
      const deleted = await deleteAssignments(competitionId);
      await loadGlobalData();
      if (selectedRaceId) await loadRaceData(selectedRaceId);
      return {
        success: true,
        message: `Deleted ${deleted} assignment rows. You can now regenerate.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message ?? "Failed to delete assignments",
      };
    }
  }, [competitionId, loadGlobalData, loadRaceData, selectedRaceId]);

  return {
    races,
    drivers,
    members,
    assignmentCount,
    raceResults,
    raceAssignments,
    loading,
    raceLoading,
    error,
    fetchResults,
    saveResults,
    lockPredictions,
    unlockPredictions,
    updateLockTime,
    calculateScores,
    generateAssignments,
    resetAssignments,
    refetch: loadGlobalData,
    refetchRaceData: loadRaceData,
  };
}
