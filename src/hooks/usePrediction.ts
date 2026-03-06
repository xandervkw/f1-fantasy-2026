import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Prediction } from "@/types";

export interface PredictionState {
  prediction: Prediction | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  /**
   * Submit or update a prediction.
   * Pass null for a position to preserve the existing value (e.g. submit
   * sprint without overwriting race prediction, or vice versa).
   */
  submitPrediction: (
    positionRace: number | null,
    positionSprint: number | null
  ) => Promise<{ error: string | null }>;
  refetch: () => void;
}

/**
 * Manage prediction lifecycle for a single race.
 *
 * - Fetches the user's existing prediction row (if any)
 * - Provides an upsert-based submit function
 * - Tracks loading and saving states
 *
 * @param raceId - UUID of the race, or null to skip
 * @param competitionId - UUID of the competition, or null to skip
 */
export function usePrediction(
  raceId: string | null,
  competitionId: string | null
): PredictionState {
  const { user } = useAuth();

  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = useCallback(async () => {
    if (!user || !raceId || !competitionId) {
      setPrediction(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", user.id)
        .eq("race_id", raceId)
        .eq("competition_id", competitionId)
        .maybeSingle();

      if (fetchErr) throw new Error(fetchErr.message);
      setPrediction((data as Prediction) ?? null);
    } catch (err) {
      console.error("[usePrediction] fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load prediction");
    } finally {
      setLoading(false);
    }
  }, [user, raceId, competitionId]);

  useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  const submitPrediction = useCallback(
    async (
      positionRace: number | null,
      positionSprint: number | null
    ): Promise<{ error: string | null }> => {
      if (!user || !raceId || !competitionId) {
        return { error: "Missing required data" };
      }

      setSaving(true);
      setError(null);

      try {
        const { data, error: upsertErr } = await supabase
          .from("predictions")
          .upsert(
            {
              user_id: user.id,
              race_id: raceId,
              competition_id: competitionId,
              predicted_position_race: positionRace,
              predicted_position_sprint: positionSprint,
              submitted_at: new Date().toISOString(),
              is_missed: false,
            },
            { onConflict: "user_id,race_id,competition_id" }
          )
          .select()
          .single();

        if (upsertErr) {
          // RLS will reject if prediction is locked
          const msg = upsertErr.message.includes("row-level security")
            ? "Prediction is locked and cannot be changed."
            : upsertErr.message;
          setError(msg);
          return { error: msg };
        }

        setPrediction(data as Prediction);
        return { error: null };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to save prediction";
        setError(msg);
        return { error: msg };
      } finally {
        setSaving(false);
      }
    },
    [user, raceId, competitionId]
  );

  return {
    prediction,
    loading,
    saving,
    error,
    submitPrediction,
    refetch: fetchPrediction,
  };
}
