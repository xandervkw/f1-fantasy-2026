import { describe, it, expect } from "vitest";
import {
  calculateRacePoints,
  calculateSprintPoints,
  resolveFinishPosition,
} from "../../src/lib/scoring";

// ============================================================
// resolveFinishPosition
// ============================================================
describe("resolveFinishPosition", () => {
  it("returns the position as-is when not DNF", () => {
    expect(resolveFinishPosition(1, false)).toBe(1);
    expect(resolveFinishPosition(10, false)).toBe(10);
    expect(resolveFinishPosition(22, false)).toBe(22);
  });

  it("returns P22 when driver DNFs regardless of stored position", () => {
    expect(resolveFinishPosition(1, true)).toBe(22);
    expect(resolveFinishPosition(15, true)).toBe(22);
    expect(resolveFinishPosition(22, true)).toBe(22);
  });

  it("returns P22 when DNF even with position 0 (edge case)", () => {
    expect(resolveFinishPosition(0, true)).toBe(22);
  });
});

// ============================================================
// calculateRacePoints
// ============================================================
describe("calculateRacePoints", () => {
  // --- exact point thresholds ---
  it("returns 10 for exact prediction (0 off)", () => {
    expect(calculateRacePoints(1, 1)).toBe(10);
    expect(calculateRacePoints(10, 10)).toBe(10);
    expect(calculateRacePoints(22, 22)).toBe(10);
  });

  it("returns 7 for off-by-1", () => {
    expect(calculateRacePoints(1, 2)).toBe(7);
    expect(calculateRacePoints(5, 4)).toBe(7);
  });

  it("returns 5 for off-by-2", () => {
    expect(calculateRacePoints(3, 5)).toBe(5);
    expect(calculateRacePoints(10, 8)).toBe(5);
  });

  it("returns 3 for off-by-3", () => {
    expect(calculateRacePoints(1, 4)).toBe(3);
    expect(calculateRacePoints(15, 12)).toBe(3);
  });

  it("returns 2 for off-by-4", () => {
    expect(calculateRacePoints(1, 5)).toBe(2);
    expect(calculateRacePoints(20, 16)).toBe(2);
  });

  it("returns 1 for off-by-5", () => {
    expect(calculateRacePoints(1, 6)).toBe(1);
    expect(calculateRacePoints(10, 5)).toBe(1);
  });

  it("returns 0 for off-by-6 or more", () => {
    expect(calculateRacePoints(1, 7)).toBe(0);
    expect(calculateRacePoints(1, 22)).toBe(0);
    expect(calculateRacePoints(22, 1)).toBe(0);
    expect(calculateRacePoints(1, 20)).toBe(0);
  });

  // --- symmetry: over-predicting vs under-predicting ---
  it("is symmetric — same points whether predicted above or below actual", () => {
    expect(calculateRacePoints(5, 8)).toBe(calculateRacePoints(8, 5)); // off by 3
    expect(calculateRacePoints(1, 3)).toBe(calculateRacePoints(3, 1)); // off by 2
    expect(calculateRacePoints(10, 15)).toBe(calculateRacePoints(15, 10)); // off by 5
  });

  // --- DNF scenario: driver DNFs → actual = P22 ---
  it("scores correctly when driver DNFs (actual = P22)", () => {
    // Predicted P22, actual P22 (DNF) → exact → 10 pts
    expect(calculateRacePoints(22, 22)).toBe(10);
    // Predicted P21, actual P22 (DNF) → off by 1 → 7 pts
    expect(calculateRacePoints(21, 22)).toBe(7);
    // Predicted P20, actual P22 (DNF) → off by 2 → 5 pts
    expect(calculateRacePoints(20, 22)).toBe(5);
    // Predicted P17, actual P22 (DNF) → off by 5 → 1 pt
    expect(calculateRacePoints(17, 22)).toBe(1);
    // Predicted P15, actual P22 (DNF) → off by 7 → 0 pts
    expect(calculateRacePoints(15, 22)).toBe(0);
    // Predicted P1, actual P22 (DNF) → off by 21 → 0 pts
    expect(calculateRacePoints(1, 22)).toBe(0);
  });

  // --- boundary positions ---
  it("handles P1 and P22 extremes", () => {
    expect(calculateRacePoints(1, 1)).toBe(10);
    expect(calculateRacePoints(22, 22)).toBe(10);
    expect(calculateRacePoints(1, 22)).toBe(0);
    expect(calculateRacePoints(22, 1)).toBe(0);
  });
});

// ============================================================
// calculateSprintPoints
// ============================================================
describe("calculateSprintPoints", () => {
  // --- exact point thresholds ---
  it("returns 5 for exact prediction (0 off)", () => {
    expect(calculateSprintPoints(1, 1)).toBe(5);
    expect(calculateSprintPoints(10, 10)).toBe(5);
    expect(calculateSprintPoints(22, 22)).toBe(5);
  });

  it("returns 4 for off-by-1", () => {
    expect(calculateSprintPoints(1, 2)).toBe(4);
    expect(calculateSprintPoints(5, 4)).toBe(4);
  });

  it("returns 3 for off-by-2", () => {
    expect(calculateSprintPoints(3, 5)).toBe(3);
    expect(calculateSprintPoints(10, 8)).toBe(3);
  });

  it("returns 2 for off-by-3", () => {
    expect(calculateSprintPoints(1, 4)).toBe(2);
    expect(calculateSprintPoints(15, 12)).toBe(2);
  });

  it("returns 1 for off-by-4", () => {
    expect(calculateSprintPoints(1, 5)).toBe(1);
    expect(calculateSprintPoints(20, 16)).toBe(1);
  });

  it("returns 0 for off-by-5 or more", () => {
    expect(calculateSprintPoints(1, 6)).toBe(0);
    expect(calculateSprintPoints(1, 22)).toBe(0);
    expect(calculateSprintPoints(22, 1)).toBe(0);
    expect(calculateSprintPoints(5, 15)).toBe(0);
  });

  // --- symmetry ---
  it("is symmetric — same points whether predicted above or below actual", () => {
    expect(calculateSprintPoints(5, 8)).toBe(calculateSprintPoints(8, 5));
    expect(calculateSprintPoints(1, 3)).toBe(calculateSprintPoints(3, 1));
    expect(calculateSprintPoints(10, 14)).toBe(calculateSprintPoints(14, 10));
  });

  // --- DNF scenario for sprint ---
  it("scores correctly when driver DNFs in sprint (actual = P22)", () => {
    expect(calculateSprintPoints(22, 22)).toBe(5);
    expect(calculateSprintPoints(21, 22)).toBe(4);
    expect(calculateSprintPoints(20, 22)).toBe(3);
    expect(calculateSprintPoints(18, 22)).toBe(1);
    expect(calculateSprintPoints(17, 22)).toBe(0);
    expect(calculateSprintPoints(1, 22)).toBe(0);
  });
});

// ============================================================
// Integration: resolveFinishPosition + scoring
// ============================================================
describe("end-to-end scoring with DNF resolution", () => {
  it("predicted P5, driver finishes P5 → 10 race points", () => {
    const actual = resolveFinishPosition(5, false);
    expect(calculateRacePoints(5, actual)).toBe(10);
  });

  it("predicted P5, driver DNFs → actual P22, off by 17 → 0 race points", () => {
    const actual = resolveFinishPosition(5, true);
    expect(actual).toBe(22);
    expect(calculateRacePoints(5, actual)).toBe(0);
  });

  it("predicted P22, driver DNFs → actual P22, exact → 10 race points", () => {
    const actual = resolveFinishPosition(22, true);
    expect(actual).toBe(22);
    expect(calculateRacePoints(22, actual)).toBe(10);
  });

  it("predicted P20, driver DNFs → actual P22, off by 2 → 5 race points", () => {
    const actual = resolveFinishPosition(20, true);
    expect(calculateRacePoints(20, actual)).toBe(5);
  });

  it("predicted P3, driver finishes P1 → off by 2 → 3 sprint points", () => {
    const actual = resolveFinishPosition(1, false);
    expect(calculateSprintPoints(3, actual)).toBe(3);
  });

  it("predicted P10, driver DNFs in sprint → actual P22, off by 12 → 0 sprint points", () => {
    const actual = resolveFinishPosition(10, true);
    expect(calculateSprintPoints(10, actual)).toBe(0);
  });

  it("predicted P19, driver DNFs in sprint → actual P22, off by 3 → 2 sprint points", () => {
    const actual = resolveFinishPosition(19, true);
    expect(calculateSprintPoints(19, actual)).toBe(2);
  });
});
