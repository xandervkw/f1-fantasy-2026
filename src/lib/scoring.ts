export function calculateRacePoints(predicted: number, actual: number): number {
  const diff = Math.abs(predicted - actual);
  if (diff === 0) return 10;
  if (diff === 1) return 7;
  if (diff === 2) return 5;
  if (diff === 3) return 3;
  if (diff === 4) return 2;
  if (diff === 5) return 1;
  return 0;
}

export function calculateSprintPoints(predicted: number, actual: number): number {
  const diff = Math.abs(predicted - actual);
  if (diff === 0) return 5;
  if (diff === 1) return 4;
  if (diff === 2) return 3;
  if (diff === 3) return 2;
  if (diff === 4) return 1;
  return 0;
}

export function resolveFinishPosition(position: number, isDnf: boolean): number {
  return isDnf ? 22 : position;
}
