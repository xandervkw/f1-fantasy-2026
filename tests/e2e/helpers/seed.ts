import { adminClient } from "./supabase-admin";
import {
  COMPETITION_ID,
  RACE_R1_AUSTRALIA,
  RACE_R6_MIAMI,
} from "./constants";

export interface SeedData {
  userId: string;
  driverIdForR6: string;
  raceIds: string[]; // R1–R5 IDs used
}

/**
 * Seed all test data for the "main" test user (the one with full competition access).
 *
 * Creates: competition_member, driver_assignments (R1–R6),
 *          predictions (R1–R5), scores (R1–R5).
 */
export async function seedMainUser(userId: string): Promise<SeedData> {
  // 1. Insert competition membership
  const { error: memberError } = await adminClient
    .from("competition_members")
    .insert({ competition_id: COMPETITION_ID, user_id: userId });

  if (memberError) {
    throw new Error(`Failed to insert competition_member: ${memberError.message}`);
  }

  // 2. Find a driver that has results for R1 (so history joins work)
  const { data: resultRows, error: resultError } = await adminClient
    .from("results")
    .select("driver_id")
    .eq("race_id", RACE_R1_AUSTRALIA)
    .limit(1);

  if (resultError || !resultRows?.length) {
    throw new Error(
      `No results found for R1: ${resultError?.message ?? "empty"}`
    );
  }

  const driverId = resultRows[0].driver_id;

  // 3. Get R1–R5 race IDs (completed races)
  const { data: completedRaces, error: racesError } = await adminClient
    .from("races")
    .select("id, round_number")
    .eq("season", 2026)
    .in("round_number", [1, 2, 3, 4, 5])
    .order("round_number");

  if (racesError || !completedRaces?.length) {
    throw new Error(`Failed to fetch R1–R5: ${racesError?.message ?? "empty"}`);
  }

  const raceIds = completedRaces.map((r) => r.id);

  // 4. Insert driver_assignments for R1–R6
  const assignmentRows = [
    ...raceIds.map((raceId) => ({
      competition_id: COMPETITION_ID,
      race_id: raceId,
      user_id: userId,
      driver_id: driverId,
    })),
    {
      competition_id: COMPETITION_ID,
      race_id: RACE_R6_MIAMI,
      user_id: userId,
      driver_id: driverId,
    },
  ];

  const { error: assignError } = await adminClient
    .from("driver_assignments")
    .insert(assignmentRows);

  if (assignError) {
    throw new Error(`Failed to insert assignments: ${assignError.message}`);
  }

  // 5. Insert predictions for R1–R5 (locked, so history page can show them)
  const predictionData = [
    { predicted_position_race: 3, predicted_position_sprint: null, is_sprint_locked: false },
    { predicted_position_race: 5, predicted_position_sprint: 4, is_sprint_locked: true }, // R2 is sprint
    { predicted_position_race: 7, predicted_position_sprint: null, is_sprint_locked: false },
    { predicted_position_race: 2, predicted_position_sprint: null, is_sprint_locked: false },
    { predicted_position_race: 10, predicted_position_sprint: null, is_sprint_locked: false },
  ];

  const predictionRows = raceIds.map((raceId, i) => ({
    user_id: userId,
    race_id: raceId,
    competition_id: COMPETITION_ID,
    predicted_position_race: predictionData[i].predicted_position_race,
    predicted_position_sprint: predictionData[i].predicted_position_sprint,
    is_locked: true,
    is_sprint_locked: predictionData[i].is_sprint_locked,
    submitted_at: new Date().toISOString(),
  }));

  const { error: predError } = await adminClient
    .from("predictions")
    .insert(predictionRows);

  if (predError) {
    throw new Error(`Failed to insert predictions: ${predError.message}`);
  }

  // 6. Insert scores for R1–R5
  const scoreData = [
    { race_points: 7, sprint_points: 0, total_points: 7, race_position_off: 1, sprint_position_off: null },
    { race_points: 5, sprint_points: 3, total_points: 8, race_position_off: 2, sprint_position_off: 2 },
    { race_points: 10, sprint_points: 0, total_points: 10, race_position_off: 0, sprint_position_off: null },
    { race_points: 3, sprint_points: 0, total_points: 3, race_position_off: 3, sprint_position_off: null },
    { race_points: 7, sprint_points: 0, total_points: 7, race_position_off: 1, sprint_position_off: null },
  ];

  const scoreRows = raceIds.map((raceId, i) => ({
    user_id: userId,
    race_id: raceId,
    competition_id: COMPETITION_ID,
    ...scoreData[i],
  }));

  const { error: scoreError } = await adminClient
    .from("scores")
    .insert(scoreRows);

  if (scoreError) {
    throw new Error(`Failed to insert scores: ${scoreError.message}`);
  }

  return { userId, driverIdForR6: driverId, raceIds };
}

/** Clean up all seeded data for a test user (does not delete the auth user). */
export async function cleanupUser(userId: string): Promise<void> {
  // Delete in reverse dependency order
  await adminClient.from("scores").delete().eq("user_id", userId);
  await adminClient.from("predictions").delete().eq("user_id", userId);
  await adminClient.from("driver_assignments").delete().eq("user_id", userId);
  await adminClient.from("competition_members").delete().eq("user_id", userId);
}
