const BASE_URL = "https://api.jolpi.ca/ergast/f1/2026";

export async function fetchSchedule() {
  const res = await fetch(`${BASE_URL}/races/`);
  return res.json();
}

export async function fetchRaceResults(round: number) {
  const res = await fetch(`${BASE_URL}/${round}/results/`);
  return res.json();
}

export async function fetchSprintResults(round: number) {
  const res = await fetch(`${BASE_URL}/${round}/sprint/`);
  return res.json();
}

export async function fetchDrivers() {
  const res = await fetch(`${BASE_URL}/drivers/`);
  return res.json();
}
