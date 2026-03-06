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
  acceptingMembers: boolean;

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
  lockPredictions: (
    raceId: string,
    competitionId: string,
    type: "race" | "sprint" | "both"
  ) => Promise<MutationResult>;
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
  updateRaceStatus: (
    raceId: string,
    status: "active" | "completed" | "upcoming"
  ) => Promise<MutationResult>;
  generateAssignments: () => Promise<MutationResult>;
  resetAssignments: () => Promise<MutationResult>;
  toggleAcceptingMembers: (value: boolean) => Promise<MutationResult>;

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
  const [acceptingMembers, setAcceptingMembers] = useState(true);

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
      const [racesRes, driversRes, membersRes, aCount, compRes] =
        await Promise.all([
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
          supabase
            .from("competitions")
            .select("accepting_members")
            .eq("id", competitionId)
            .single(),
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
      setAcceptingMembers(compRes.data?.accepting_members ?? true);
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

  const lockPredictions = useCallback(
    async (
      raceId: string,
      cId: string,
      type: "race" | "sprint" | "both"
    ): Promise<MutationResult> => {
      try {
        const { data, error: rpcErr } = await supabase.rpc(
          "lock_race_predictions",
          {
            p_race_id: raceId,
            p_competition_id: cId,
            p_type: type,
          }
        );

        if (rpcErr) throw rpcErr;

        const result = data as {
          race_locked: number;
          sprint_locked: number;
          missed: number;
        };

        await loadGlobalData(); // refresh race flags
        return {
          success: true,
          message: `Locked: ${result.race_locked} race${result.sprint_locked > 0 ? `, ${result.sprint_locked} sprint` : ""}${result.missed > 0 ? `, ${result.missed} missed` : ""}.`,
        };
      } catch (err: any) {
        return {
          success: false,
          message: err.message ?? "Failed to lock predictions",
        };
      }
    },
    [loadGlobalData]
  );

  const unlockPredictions = useCallback(
    async (
      raceId: string,
      cId: string,
      type: "race" | "sprint" | "both"
    ): Promise<MutationResult> => {
      try {
        const { data, error: rpcErr } = await supabase.rpc(
          "unlock_race_predictions",
          {
            p_race_id: raceId,
            p_competition_id: cId,
            p_type: type,
          }
        );

        if (rpcErr) throw rpcErr;

        const result = data as { updated: number; type: string };

        await loadGlobalData(); // refresh race flags
        return {
          success: true,
          message: `Unlocked ${result.type} predictions. ${result.updated} rows updated.`,
        };
      } catch (err: any) {
        return {
          success: false,
          message: err.message ?? "Failed to unlock predictions",
        };
      }
    },
    [loadGlobalData]
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
        const { data, error: rpcError } = await supabase.rpc(
          "calculate_scores",
          { p_race_id: raceId }
        );
        if (rpcError) {
          return {
            success: false,
            message: rpcError.message ?? "Score calculation failed",
          };
        }
        const result = data ?? {};
        return {
          success: true,
          message: `Scores calculated. ${result?.scores_calculated ?? "?"} score rows.`,
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

  const updateRaceStatus = useCallback(
    async (
      raceId: string,
      status: "active" | "completed" | "upcoming"
    ): Promise<MutationResult> => {
      try {
        const { error: updateErr } = await supabase
          .from("races")
          .update({ status })
          .eq("id", raceId);

        if (updateErr) {
          return { success: false, message: updateErr.message };
        }

        // If marking completed, auto-activate the next upcoming race
        if (status === "completed") {
          const { data: nextRace } = await supabase
            .from("races")
            .select("id")
            .eq("season", 2026)
            .eq("status", "upcoming")
            .order("round_number", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (nextRace) {
            await supabase
              .from("races")
              .update({ status: "active" })
              .eq("id", nextRace.id);
          }
        }

        await loadGlobalData();
        return {
          success: true,
          message:
            status === "completed"
              ? "Race marked as completed. Next race activated."
              : `Race status set to ${status}.`,
        };
      } catch (err: any) {
        return {
          success: false,
          message: err.message ?? "Failed to update race status",
        };
      }
    },
    [loadGlobalData]
  );

  const generateAssignments = useCallback(async (): Promise<MutationResult> => {
    if (!competitionId)
      return { success: false, message: "No competition selected" };
    try {
      const result = await storeAssignments(competitionId);
      // Auto-close competition for new members
      await supabase
        .from("competitions")
        .update({ accepting_members: false })
        .eq("id", competitionId);
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
      // Re-open competition for new members
      await supabase
        .from("competitions")
        .update({ accepting_members: true })
        .eq("id", competitionId);
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

  const toggleAcceptingMembers = useCallback(
    async (value: boolean): Promise<MutationResult> => {
      if (!competitionId)
        return { success: false, message: "No competition selected" };
      try {
        const { error: updateErr } = await supabase
          .from("competitions")
          .update({ accepting_members: value })
          .eq("id", competitionId);

        if (updateErr) {
          return { success: false, message: updateErr.message };
        }

        await loadGlobalData();
        return {
          success: true,
          message: value
            ? "Competition is now open for new members."
            : "Competition is now closed to new members.",
        };
      } catch (err: any) {
        return {
          success: false,
          message: err.message ?? "Failed to update competition",
        };
      }
    },
    [competitionId, loadGlobalData]
  );

  return {
    races,
    drivers,
    members,
    assignmentCount,
    acceptingMembers,
    raceResults,
    raceAssignments,
    loading,
    raceLoading,
    error,
    fetchResults,
    saveResults,
    lockPredictions,
    unlockPredictions,
    updateRaceStatus,
    updateLockTime,
    calculateScores,
    generateAssignments,
    resetAssignments,
    toggleAcceptingMembers,
    refetch: loadGlobalData,
    refetchRaceData: loadRaceData,
  };
}
