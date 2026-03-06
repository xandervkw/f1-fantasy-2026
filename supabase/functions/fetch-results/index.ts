// Supabase Edge Function: fetch-results
// Fetches race (and sprint) results from the Jolpica F1 API,
// stores them in the results table, marks the race as completed,
// and triggers score calculation via the calculate_scores() RPC.
//
// Usage:
//   POST { "round_number": 1 }   — fetch a specific round
//   POST {} or GET               — auto-detect next race needing results

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1/2026";

// ---------- Jolpica API types ----------

interface JolpicaDriver {
  driverId: string;
  code: string;
  givenName: string;
  familyName: string;
}

interface JolpicaResult {
  position: string;
  Driver: JolpicaDriver;
  status: string;
}

// ---------- helpers ----------

/** DNF = any status that isn't "Finished" and doesn't start with "+" (lapped finishers) */
function isDnf(status: string): boolean {
  return status !== "Finished" && !status.startsWith("+");
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------- main ----------

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ---- 1. Determine which round to fetch ----
  let roundNumber: number | null = null;

  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body.round_number) roundNumber = Number(body.round_number);
    } catch {
      // empty body → auto-detect
    }
  }

  // Auto-detect: find the first race whose race_date has passed but isn't completed
  if (roundNumber == null) {
    const today = new Date().toISOString().split("T")[0];
    const { data: pending } = await supabase
      .from("races")
      .select("round_number")
      .eq("season", 2026)
      .neq("status", "completed")
      .lte("race_date", today)
      .order("round_number", { ascending: true })
      .limit(1);

    if (!pending || pending.length === 0) {
      console.log("No races pending results");
      return jsonResponse({ message: "No races pending results" });
    }
    roundNumber = pending[0].round_number;
  }

  console.log(`Fetching results for round ${roundNumber}`);

  // ---- 2. Load race from DB ----
  const { data: race, error: raceErr } = await supabase
    .from("races")
    .select("*")
    .eq("round_number", roundNumber)
    .eq("season", 2026)
    .single();

  if (raceErr || !race) {
    return jsonResponse({ error: `Race round ${roundNumber} not found` }, 404);
  }

  // ---- 3. Skip if results already stored ----
  const { count: existingCount } = await supabase
    .from("results")
    .select("*", { count: "exact", head: true })
    .eq("race_id", race.id);

  if (existingCount && existingCount > 0) {
    return jsonResponse({
      message: `Results already exist for round ${roundNumber} (${race.race_name})`,
      race_id: race.id,
    });
  }

  // ---- 4. Load drivers from DB for code → id mapping ----
  const { data: dbDrivers } = await supabase
    .from("drivers")
    .select("id, abbreviation")
    .eq("season", 2026);

  if (!dbDrivers || dbDrivers.length === 0) {
    return jsonResponse({ error: "No drivers found in database" }, 500);
  }

  const driverByCode = new Map(dbDrivers.map((d) => [d.abbreviation, d.id]));

  // ---- 5. Fetch RACE results from Jolpica ----
  let raceResults: JolpicaResult[] | null = null;
  try {
    const res = await fetch(`${JOLPICA_BASE}/${roundNumber}/results/`);
    if (res.ok) {
      const data = await res.json();
      raceResults = data?.MRData?.RaceTable?.Races?.[0]?.Results ?? null;
    }
  } catch (e) {
    console.error("Jolpica race results fetch failed:", e);
  }

  if (!raceResults || raceResults.length === 0) {
    console.log(`No race results available yet for round ${roundNumber}`);
    return jsonResponse({
      message: `No race results available yet for round ${roundNumber} (${race.race_name})`,
      will_retry: true,
    });
  }

  // ---- 6. Fetch SPRINT results if sprint weekend ----
  let sprintResults: JolpicaResult[] | null = null;
  if (race.is_sprint_weekend) {
    try {
      const res = await fetch(`${JOLPICA_BASE}/${roundNumber}/sprint/`);
      if (res.ok) {
        const data = await res.json();
        sprintResults =
          data?.MRData?.RaceTable?.Races?.[0]?.SprintResults ?? null;
      }
    } catch (e) {
      console.error("Jolpica sprint results fetch failed:", e);
    }

    if (!sprintResults) {
      console.warn(
        `Sprint weekend but no sprint results available for round ${roundNumber}`
      );
    }
  }

  // ---- 7. Map API results → DB rows ----
  // Index race results by driver code
  const raceByCode = new Map<string, { position: number; dnf: boolean }>();
  for (const r of raceResults) {
    raceByCode.set(r.Driver.code, {
      position: parseInt(r.position, 10),
      dnf: isDnf(r.status),
    });
  }

  // Index sprint results by driver code
  const sprintByCode = new Map<string, { position: number; dnf: boolean }>();
  if (sprintResults) {
    for (const r of sprintResults) {
      sprintByCode.set(r.Driver.code, {
        position: parseInt(r.position, 10),
        dnf: isDnf(r.status),
      });
    }
  }

  const allCodes = new Set([...raceByCode.keys(), ...sprintByCode.keys()]);
  const unmatchedCodes: string[] = [];
  const resultRows: Array<{
    race_id: string;
    driver_id: string;
    finish_position_race: number | null;
    finish_position_sprint: number | null;
    is_dnf_race: boolean;
    is_dnf_sprint: boolean;
  }> = [];

  for (const code of allCodes) {
    const driverId = driverByCode.get(code);
    if (!driverId) {
      unmatchedCodes.push(code);
      continue;
    }

    const race_ = raceByCode.get(code);
    const sprint_ = sprintByCode.get(code);

    resultRows.push({
      race_id: race.id,
      driver_id: driverId,
      finish_position_race: race_?.position ?? null,
      finish_position_sprint: sprint_?.position ?? null,
      is_dnf_race: race_?.dnf ?? false,
      is_dnf_sprint: sprint_?.dnf ?? false,
    });
  }

  if (unmatchedCodes.length > 0) {
    console.warn("Driver codes from API not found in DB:", unmatchedCodes);
  }

  // ---- 8. Upsert results ----
  const { error: upsertErr } = await supabase
    .from("results")
    .upsert(resultRows, { onConflict: "race_id,driver_id" });

  if (upsertErr) {
    console.error("Results upsert failed:", upsertErr.message);
    return jsonResponse({ error: `Results upsert failed: ${upsertErr.message}` }, 500);
  }

  console.log(`Stored ${resultRows.length} result rows for round ${roundNumber}`);

  // ---- 9. Mark race as completed ----
  const { error: statusErr } = await supabase
    .from("races")
    .update({ status: "completed" })
    .eq("id", race.id);

  if (statusErr) {
    console.error("Failed to update race status:", statusErr.message);
    // Non-fatal — continue to score calculation
  }

  // ---- 10. Calculate scores via calculate-scores edge function ----
  let scoreResult: Record<string, unknown> | null = null;
  let scoreError: string | null = null;

  try {
    const fnUrl =
      Deno.env.get("SUPABASE_URL")! + "/functions/v1/calculate-scores";
    const scoreRes = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
      },
      body: JSON.stringify({ race_id: race.id }),
    });
    scoreResult = await scoreRes.json();

    if (!scoreRes.ok) {
      scoreError = JSON.stringify(scoreResult);
      console.error("Score calculation failed:", scoreError);
    } else {
      console.log("Scores calculated:", JSON.stringify(scoreResult));
    }
  } catch (e) {
    scoreError = e instanceof Error ? e.message : String(e);
    console.error("Score calculation request failed:", scoreError);
  }

  return jsonResponse({
    success: true,
    round_number: roundNumber,
    race_name: race.race_name,
    results_stored: resultRows.length,
    unmatched_drivers: unmatchedCodes,
    scores: scoreResult,
    score_error: scoreError,
  });
});
