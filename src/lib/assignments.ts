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
