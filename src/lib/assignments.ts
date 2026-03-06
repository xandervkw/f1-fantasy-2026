/**
 * Latin square driver rotation for F1 Fantasy 2026.
 *
 * Generates a 22×22 Latin square where:
 *  - Rows    = rounds (1-22)
 *  - Columns = players
 *  - Each cell = a driver index
 *
 * Properties guaranteed for ≤22 players:
 *  1. No player gets the same driver twice across 22 rounds
 *  2. No two players get the same driver in the same round
 *
 * For <22 players we simply take the first N columns.
 *
 * A seeded PRNG is used so results are deterministic given the same seed.
 */

import { supabase } from "@/lib/supabase";

// ---------- seeded PRNG (mulberry32) ----------

type RNG = () => number;

/**
 * mulberry32 — fast 32-bit seeded PRNG that returns values in [0, 1).
 */
function mulberry32(seed: number): RNG {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- shuffle helper ----------

/** Fisher-Yates shuffle using provided RNG. Mutates the array in-place. */
function shuffle<T>(arr: T[], rng: RNG): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- Latin square generation ----------

/**
 * Generate a base 22×22 Latin square using cyclic construction:
 *   square[row][col] = (row + col) % 22
 *
 * Then shuffle rows and columns independently to randomise it
 * while preserving the Latin square property.
 */
function generateLatinSquare(size: number, rng: RNG): number[][] {
  // Build cyclic Latin square
  const square: number[][] = [];
  for (let row = 0; row < size; row++) {
    const r: number[] = [];
    for (let col = 0; col < size; col++) {
      r.push((row + col) % size);
    }
    square.push(r);
  }

  // Shuffle rows (= shuffle which round gets which assignment pattern)
  shuffle(square, rng);

  // Shuffle columns (= shuffle which player gets which sequence)
  const colOrder = shuffle(
    Array.from({ length: size }, (_, i) => i),
    rng
  );
  for (let row = 0; row < size; row++) {
    const original = [...square[row]];
    for (let col = 0; col < size; col++) {
      square[row][col] = original[colOrder[col]];
    }
  }

  // Shuffle the symbol mapping (= shuffle which index maps to which driver)
  const symbolMap = shuffle(
    Array.from({ length: size }, (_, i) => i),
    rng
  );
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      square[row][col] = symbolMap[square[row][col]];
    }
  }

  return square;
}

// ---------- public API ----------

export interface AssignmentMatrix {
  /** matrix[roundIndex][playerIndex] = driverID */
  matrix: string[][];
  /** The round count (22) */
  rounds: number;
  /** Player IDs in column order */
  playerIds: string[];
  /** Driver IDs in the order used internally */
  driverIds: string[];
}

/**
 * Generate driver assignments for a competition.
 *
 * @param playerIds  - array of player UUIDs (≤22 for unique-per-round guarantee)
 * @param driverIds  - array of exactly 22 driver UUIDs
 * @param rounds     - number of assignment rounds (default 22)
 * @param seed       - numeric seed for deterministic randomness
 * @returns AssignmentMatrix with matrix[round][player] = driverID
 */
export function generateAssignments(
  playerIds: string[],
  driverIds: string[],
  rounds: number = 22,
  seed: number = Date.now()
): AssignmentMatrix {
  if (driverIds.length !== 22) {
    throw new Error(`Expected 22 drivers, got ${driverIds.length}`);
  }
  if (rounds < 1 || rounds > 22) {
    throw new Error(`Rounds must be between 1 and 22, got ${rounds}`);
  }
  if (playerIds.length === 0) {
    throw new Error("At least one player is required");
  }
  if (playerIds.length > 22) {
    throw new Error(
      `Maximum 22 players for unique assignments, got ${playerIds.length}`
    );
  }

  const rng = mulberry32(seed);
  const size = 22;

  // Generate a full 22×22 Latin square (indices 0-21)
  const square = generateLatinSquare(size, rng);

  // Take only the rows (rounds) and columns (players) we need,
  // mapping indices → actual driver IDs
  const numPlayers = playerIds.length;
  const matrix: string[][] = [];

  for (let round = 0; round < rounds; round++) {
    const row: string[] = [];
    for (let player = 0; player < numPlayers; player++) {
      row.push(driverIds[square[round][player]]);
    }
    matrix.push(row);
  }

  return {
    matrix,
    rounds,
    playerIds,
    driverIds,
  };
}

// ---------- Supabase helpers ----------

export interface StoreAssignmentsResult {
  inserted: number;
  playerCount: number;
  roundCount: number;
}

/**
 * Check whether driver assignments already exist for a competition.
 */
export async function checkExistingAssignments(
  competitionId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("driver_assignments")
    .select("id", { count: "exact", head: true })
    .eq("competition_id", competitionId);

  if (error) throw new Error(`Failed to check assignments: ${error.message}`);
  return count ?? 0;
}

/**
 * Generate and store all 22 rounds of driver assignments for a competition.
 *
 * Flow:
 *  1. Verify no assignments exist yet (idempotency guard)
 *  2. Fetch competition members, drivers (22), and races (rounds 1-22)
 *  3. Generate the Latin square matrix
 *  4. Batch-insert into driver_assignments
 *
 * @param competitionId - UUID of the competition
 * @returns number of rows inserted
 * @throws if assignments already exist, or if data is missing
 */
export async function storeAssignments(
  competitionId: string
): Promise<StoreAssignmentsResult> {
  // 1. Guard: no duplicate generation
  const existing = await checkExistingAssignments(competitionId);
  if (existing > 0) {
    throw new Error(
      `Assignments already exist for this competition (${existing} rows). ` +
        `Delete them first if you want to regenerate.`
    );
  }

  // 2a. Fetch members
  const { data: members, error: membersErr } = await supabase
    .from("competition_members")
    .select("user_id")
    .eq("competition_id", competitionId);

  if (membersErr) throw new Error(`Failed to load members: ${membersErr.message}`);
  if (!members || members.length === 0) {
    throw new Error("No members have joined this competition yet.");
  }
  if (members.length > 22) {
    throw new Error(`Too many members (${members.length}). Maximum is 22.`);
  }

  // 2b. Fetch all 22 drivers for the 2026 season
  const { data: drivers, error: driversErr } = await supabase
    .from("drivers")
    .select("id")
    .eq("season", 2026);

  if (driversErr) throw new Error(`Failed to load drivers: ${driversErr.message}`);
  if (!drivers || drivers.length !== 22) {
    throw new Error(`Expected 22 drivers, found ${drivers?.length ?? 0}.`);
  }

  // 2c. Fetch the first 22 races (Latin square rounds), ordered by round_number
  const { data: races, error: racesErr } = await supabase
    .from("races")
    .select("id, round_number")
    .eq("season", 2026)
    .order("round_number", { ascending: true })
    .lte("round_number", 22);

  if (racesErr) throw new Error(`Failed to load races: ${racesErr.message}`);
  if (!races || races.length < 22) {
    throw new Error(
      `Expected 22 races (rounds 1-22), found ${races?.length ?? 0}.`
    );
  }

  // 3. Generate the assignment matrix
  const playerIds = members.map((m) => m.user_id);
  const driverIds = drivers.map((d) => d.id);
  const seed = Date.now();

  const result = generateAssignments(playerIds, driverIds, 22, seed);

  // 4. Build insert rows: 22 rounds × N players
  const rows: {
    competition_id: string;
    race_id: string;
    user_id: string;
    driver_id: string;
  }[] = [];

  for (let round = 0; round < 22; round++) {
    for (let player = 0; player < playerIds.length; player++) {
      rows.push({
        competition_id: competitionId,
        race_id: races[round].id,
        user_id: playerIds[player],
        driver_id: result.matrix[round][player],
      });
    }
  }

  // 5. Batch insert (Supabase default limit is ~1000 rows per request)
  const BATCH_SIZE = 500;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error: insertErr } = await supabase
      .from("driver_assignments")
      .insert(batch);

    if (insertErr) {
      throw new Error(
        `Failed to insert assignments (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${insertErr.message}`
      );
    }
  }

  return {
    inserted: rows.length,
    playerCount: playerIds.length,
    roundCount: 22,
  };
}

/**
 * Delete all driver assignments for a competition.
 * Used by admin to reset assignments before regenerating.
 */
export async function deleteAssignments(competitionId: string): Promise<number> {
  // First count how many exist
  const count = await checkExistingAssignments(competitionId);
  if (count === 0) return 0;

  const { error } = await supabase
    .from("driver_assignments")
    .delete()
    .eq("competition_id", competitionId);

  if (error) throw new Error(`Failed to delete assignments: ${error.message}`);
  return count;
}
