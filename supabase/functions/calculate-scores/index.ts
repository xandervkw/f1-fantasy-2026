// Supabase Edge Function: calculate-scores
// Given a race_id, looks up all driver assignments and predictions,
// applies the scoring functions, and upserts into the scores table.
// Missed predictions (no predicted position) receive 0 points.
//
// Usage:  POST { "race_id": "uuid-here" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------- scoring (mirrored from src/lib/scoring.ts) ----------

function calculateRacePoints(predicted: number, actual: number): number {
  const diff = Math.abs(predicted - actual);
  if (diff === 0) return 10;
  if (diff === 1) return 7;
  if (diff === 2) return 5;
  if (diff === 3) return 3;
  if (diff === 4) return 2;
  if (diff === 5) return 1;
  return 0;
}

function calculateSprintPoints(predicted: number, actual: number): number {
  const diff = Math.abs(predicted - actual);
  if (diff === 0) return 5;
  if (diff === 1) return 4;
  if (diff === 2) return 3;
  if (diff === 3) return 2;
  if (diff === 4) return 1;
  return 0;
}

function resolveFinishPosition(position: number, isDnf: boolean): number {
  return isDnf ? 22 : position;
}

// ---------- helpers ----------

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------- main ----------

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "POST required" }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ---- 1. Parse input ----
  let raceId: string;
  try {
    const body = await req.json();
    raceId = body.race_id;
  } catch {
    return jsonResponse({ error: "Invalid JSON body, expected { race_id }" }, 400);
  }

  if (!raceId) {
    return jsonResponse({ error: "race_id is required" }, 400);
  }

  // ---- 2. Fetch all predictions for this race ----
  const { data: predictions, error: predErr } = await supabase
    .from("predictions")
    .select("*")
    .eq("race_id", raceId);

  if (predErr) {
    console.error("Failed to fetch predictions:", predErr.message);
    return jsonResponse({ error: predErr.message }, 500);
  }

  if (!predictions || predictions.length === 0) {
    return jsonResponse({ message: "No predictions found for this race", scores_calculated: 0 });
  }

  // ---- 3. Fetch all driver assignments for this race ----
  const { data: assignments, error: assignErr } = await supabase
    .from("driver_assignments")
    .select("*")
    .eq("race_id", raceId);

  if (assignErr) {
    console.error("Failed to fetch assignments:", assignErr.message);
    return jsonResponse({ error: assignErr.message }, 500);
  }

  // Map: "userId:competitionId" → driver_id
  const assignmentMap = new Map<string, string>();
  for (const a of assignments ?? []) {
    assignmentMap.set(`${a.user_id}:${a.competition_id}`, a.driver_id);
  }

  // ---- 4. Fetch all results for this race ----
  const { data: results, error: resErr } = await supabase
    .from("results")
    .select("*")
    .eq("race_id", raceId);

  if (resErr) {
    console.error("Failed to fetch results:", resErr.message);
    return jsonResponse({ error: resErr.message }, 500);
  }

  if (!results || results.length === 0) {
    return jsonResponse({ error: "No results found for this race — fetch results first" }, 400);
  }

  // Map: driver_id → result row
  const resultMap = new Map<string, {
    finish_position_race: number | null;
    finish_position_sprint: number | null;
    is_dnf_race: boolean;
    is_dnf_sprint: boolean;
  }>();
  for (const r of results) {
    resultMap.set(r.driver_id, r);
  }

  // ---- 5. Calculate scores for each prediction ----
  const scoreRows: Array<{
    user_id: string;
    race_id: string;
    competition_id: string;
    race_points: number;
    sprint_points: number;
    total_points: number;
    race_position_off: number | null;
    sprint_position_off: number | null;
  }> = [];

  const warnings: string[] = [];

  for (const pred of predictions) {
    const key = `${pred.user_id}:${pred.competition_id}`;
    const driverId = assignmentMap.get(key);

    if (!driverId) {
      warnings.push(`No assignment found for user ${pred.user_id} in competition ${pred.competition_id}`);
      continue;
    }

    const result = resultMap.get(driverId);
    if (!result) {
      warnings.push(`No result found for driver ${driverId} (user ${pred.user_id})`);
      continue;
    }

    let racePoints = 0;
    let sprintPoints = 0;
    let racePositionOff: number | null = null;
    let sprintPositionOff: number | null = null;

    // Race scoring — missed predictions (null) get 0 points
    if (
      pred.predicted_position_race != null &&
      result.finish_position_race != null
    ) {
      const actualRace = resolveFinishPosition(
        result.finish_position_race,
        result.is_dnf_race
      );
      racePoints = calculateRacePoints(pred.predicted_position_race, actualRace);
      racePositionOff = Math.abs(pred.predicted_position_race - actualRace);
    }

    // Sprint scoring — missed predictions (null) get 0 points
    if (
      pred.predicted_position_sprint != null &&
      result.finish_position_sprint != null
    ) {
      const actualSprint = resolveFinishPosition(
        result.finish_position_sprint,
        result.is_dnf_sprint
      );
      sprintPoints = calculateSprintPoints(
        pred.predicted_position_sprint,
        actualSprint
      );
      sprintPositionOff = Math.abs(pred.predicted_position_sprint - actualSprint);
    }

    scoreRows.push({
      user_id: pred.user_id,
      race_id: pred.race_id,
      competition_id: pred.competition_id,
      race_points: racePoints,
      sprint_points: sprintPoints,
      total_points: racePoints + sprintPoints,
      race_position_off: racePositionOff,
      sprint_position_off: sprintPositionOff,
    });
  }

  if (scoreRows.length === 0) {
    return jsonResponse({
      message: "No scores to calculate (no matching assignments/results)",
      warnings,
    });
  }

  // ---- 6. Upsert scores ----
  const { error: upsertErr } = await supabase
    .from("scores")
    .upsert(scoreRows, { onConflict: "user_id,race_id,competition_id" });

  if (upsertErr) {
    console.error("Scores upsert failed:", upsertErr.message);
    return jsonResponse({ error: `Scores upsert failed: ${upsertErr.message}` }, 500);
  }

  console.log(`Calculated ${scoreRows.length} scores for race ${raceId}`);
  if (warnings.length > 0) console.warn("Warnings:", warnings);

  return jsonResponse({
    success: true,
    scores_calculated: scoreRows.length,
    warnings: warnings.length > 0 ? warnings : undefined,
  });
});
