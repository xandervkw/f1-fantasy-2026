import { describe, it, expect } from "vitest";
import { generateAssignments } from "../../src/lib/assignments";

// ---------- helpers ----------

const DRIVERS = Array.from({ length: 22 }, (_, i) => `driver-${i + 1}`);
const makePlayers = (n: number) =>
  Array.from({ length: n }, (_, i) => `player-${i + 1}`);

const SEED = 42;

// ============================================================
// Input validation
// ============================================================
describe("generateAssignments — validation", () => {
  it("throws if not exactly 22 drivers", () => {
    expect(() => generateAssignments(makePlayers(5), DRIVERS.slice(0, 10), 22, SEED)).toThrow(
      "Expected 22 drivers"
    );
  });

  it("throws if 0 players", () => {
    expect(() => generateAssignments([], DRIVERS, 22, SEED)).toThrow(
      "At least one player"
    );
  });

  it("throws if more than 22 players", () => {
    expect(() => generateAssignments(makePlayers(23), DRIVERS, 22, SEED)).toThrow(
      "Maximum 22 players"
    );
  });

  it("throws if rounds out of range", () => {
    expect(() => generateAssignments(makePlayers(5), DRIVERS, 0, SEED)).toThrow("Rounds must be");
    expect(() => generateAssignments(makePlayers(5), DRIVERS, 23, SEED)).toThrow("Rounds must be");
  });
});

// ============================================================
// Latin square properties — 22 players (full square)
// ============================================================
describe("generateAssignments — 22 players, 22 rounds (full Latin square)", () => {
  const players = makePlayers(22);
  const result = generateAssignments(players, DRIVERS, 22, SEED);

  it("returns the correct dimensions", () => {
    expect(result.matrix.length).toBe(22);
    result.matrix.forEach((row) => expect(row.length).toBe(22));
  });

  it("every cell contains a valid driver ID", () => {
    const driverSet = new Set(DRIVERS);
    for (const row of result.matrix) {
      for (const cell of row) {
        expect(driverSet.has(cell)).toBe(true);
      }
    }
  });

  it("no player gets the same driver twice across 22 rounds", () => {
    for (let col = 0; col < 22; col++) {
      const driversForPlayer = result.matrix.map((row) => row[col]);
      const unique = new Set(driversForPlayer);
      expect(unique.size).toBe(22);
    }
  });

  it("no two players get the same driver in the same round", () => {
    for (let round = 0; round < 22; round++) {
      const driversInRound = result.matrix[round];
      const unique = new Set(driversInRound);
      expect(unique.size).toBe(22);
    }
  });

  it("every player gets every driver exactly once", () => {
    for (let col = 0; col < 22; col++) {
      const driversForPlayer = result.matrix.map((row) => row[col]).sort();
      expect(driversForPlayer).toEqual([...DRIVERS].sort());
    }
  });

  it("every driver appears in every round exactly once", () => {
    for (let round = 0; round < 22; round++) {
      const driversInRound = [...result.matrix[round]].sort();
      expect(driversInRound).toEqual([...DRIVERS].sort());
    }
  });
});

// ============================================================
// Fewer than 22 players (subset of columns)
// ============================================================
describe("generateAssignments — fewer than 22 players", () => {
  const players5 = makePlayers(5);
  const result = generateAssignments(players5, DRIVERS, 22, SEED);

  it("returns 22 rounds × 5 players", () => {
    expect(result.matrix.length).toBe(22);
    result.matrix.forEach((row) => expect(row.length).toBe(5));
  });

  it("no player gets the same driver twice across 22 rounds", () => {
    for (let col = 0; col < 5; col++) {
      const driversForPlayer = result.matrix.map((row) => row[col]);
      const unique = new Set(driversForPlayer);
      expect(unique.size).toBe(22);
    }
  });

  it("no two players get the same driver in the same round", () => {
    for (let round = 0; round < 22; round++) {
      const driversInRound = result.matrix[round];
      const unique = new Set(driversInRound);
      expect(unique.size).toBe(5); // all 5 are different
    }
  });

  it("every player gets every driver exactly once", () => {
    for (let col = 0; col < 5; col++) {
      const driversForPlayer = result.matrix.map((row) => row[col]).sort();
      expect(driversForPlayer).toEqual([...DRIVERS].sort());
    }
  });
});

// ============================================================
// 12 players (realistic group size)
// ============================================================
describe("generateAssignments — 12 players", () => {
  const players12 = makePlayers(12);
  const result = generateAssignments(players12, DRIVERS, 22, SEED);

  it("returns 22 rounds × 12 players", () => {
    expect(result.matrix.length).toBe(22);
    result.matrix.forEach((row) => expect(row.length).toBe(12));
  });

  it("no player gets the same driver twice across 22 rounds", () => {
    for (let col = 0; col < 12; col++) {
      const driversForPlayer = result.matrix.map((row) => row[col]);
      const unique = new Set(driversForPlayer);
      expect(unique.size).toBe(22);
    }
  });

  it("no two players get the same driver in the same round", () => {
    for (let round = 0; round < 22; round++) {
      const driversInRound = result.matrix[round];
      const unique = new Set(driversInRound);
      expect(unique.size).toBe(12);
    }
  });

  it("every player gets every driver exactly once", () => {
    for (let col = 0; col < 12; col++) {
      const driversForPlayer = result.matrix.map((row) => row[col]).sort();
      expect(driversForPlayer).toEqual([...DRIVERS].sort());
    }
  });
});

// ============================================================
// Single player
// ============================================================
describe("generateAssignments — single player", () => {
  const result = generateAssignments(makePlayers(1), DRIVERS, 22, SEED);

  it("returns 22 rounds × 1 player", () => {
    expect(result.matrix.length).toBe(22);
    result.matrix.forEach((row) => expect(row.length).toBe(1));
  });

  it("the single player gets every driver exactly once", () => {
    const allDrivers = result.matrix.map((row) => row[0]).sort();
    expect(allDrivers).toEqual([...DRIVERS].sort());
  });
});

// ============================================================
// Determinism with same seed
// ============================================================
describe("generateAssignments — determinism", () => {
  it("produces identical output given the same seed", () => {
    const a = generateAssignments(makePlayers(10), DRIVERS, 22, 12345);
    const b = generateAssignments(makePlayers(10), DRIVERS, 22, 12345);
    expect(a.matrix).toEqual(b.matrix);
  });

  it("produces different output with different seeds", () => {
    const a = generateAssignments(makePlayers(10), DRIVERS, 22, 111);
    const b = generateAssignments(makePlayers(10), DRIVERS, 22, 222);
    // Extremely unlikely to be equal with different seeds
    const aFlat = a.matrix.flat().join(",");
    const bFlat = b.matrix.flat().join(",");
    expect(aFlat).not.toEqual(bFlat);
  });
});

// ============================================================
// Shuffling (not just cyclic)
// ============================================================
describe("generateAssignments — randomness", () => {
  it("first round is not just [driver-1, driver-2, ...] in order", () => {
    const result = generateAssignments(makePlayers(22), DRIVERS, 22, SEED);
    // The first row should be shuffled, not sequential
    const firstRound = result.matrix[0];
    const sequential = DRIVERS;
    expect(firstRound).not.toEqual(sequential);
  });

  it("first column is not just cycling through drivers in order", () => {
    const result = generateAssignments(makePlayers(22), DRIVERS, 22, SEED);
    const firstPlayerDrivers = result.matrix.map((row) => row[0]);
    const sequential = DRIVERS;
    expect(firstPlayerDrivers).not.toEqual(sequential);
  });
});

// ============================================================
// Metadata returned
// ============================================================
describe("generateAssignments — return value metadata", () => {
  const players = makePlayers(8);
  const result = generateAssignments(players, DRIVERS, 22, SEED);

  it("includes playerIds in original order", () => {
    expect(result.playerIds).toEqual(players);
  });

  it("includes driverIds", () => {
    expect(result.driverIds).toEqual(DRIVERS);
  });

  it("includes the round count", () => {
    expect(result.rounds).toBe(22);
  });
});
