import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

// ---------- types ----------

export interface StandingRow {
  rank: number;
  userId: string;
  displayName: string;
  totalPoints: number;
  racesPlayed: number;
  perfectPredictions: number;
  /** Tiebreaker 2 — not displayed, used for sorting */
  oneOffPredictions: number;
  /** Tiebreaker 3 — not displayed, used for sorting */
  recentRacePoints: number;
}

interface ScoreRow {
  user_id: string;
  race_id: string;
  total_points: number;
  race_points: number;
  race_position_off: number | null;
  sprint_position_off: number | null;
  profile: { display_name: string } | null;
}

// ---------- hook ----------

export function useStandings(competitionId: string | null) {
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [members, setMembers] = useState<{ user_id: string; display_name: string }[]>([]);
  const [recentRaceId, setRecentRaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!competitionId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch scores, members, and most recent completed race in parallel
      const [scoresRes, membersRes, raceRes] = await Promise.all([
        supabase
          .from("scores")
          .select("user_id, race_id, total_points, race_points, race_position_off, sprint_position_off, profile:profiles(display_name)")
          .eq("competition_id", competitionId),
        // All competition members (so we can show everyone even before scores exist)
        supabase
          .from("competition_members")
          .select("user_id, profiles(display_name)")
          .eq("competition_id", competitionId),
        // Most recent completed race (for tiebreaker 3)
        supabase
          .from("races")
          .select("id")
          .eq("status", "completed")
          .eq("season", 2026)
          .order("round_number", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (scoresRes.error) throw scoresRes.error;
      if (membersRes.error) throw membersRes.error;

      setScores((scoresRes.data ?? []) as unknown as ScoreRow[]);
      setMembers(
        (membersRes.data ?? []).map((m: Record<string, unknown>) => ({
          user_id: m.user_id as string,
          display_name:
            (m.profiles as { display_name: string } | null)?.display_name ?? "Unknown",
        }))
      );
      setRecentRaceId(raceRes.data?.id ?? null);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("useStandings fetch error:", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription — re-fetch on any scores change
  useEffect(() => {
    if (!competitionId) return;

    const channel = supabase
      .channel("standings-scores")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scores",
          filter: `competition_id=eq.${competitionId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [competitionId, fetchData]);

  // Aggregate and rank — always includes all competition members
  const standings: StandingRow[] = useMemo(() => {
    // Seed the map with all competition members (so everyone always shows up)
    const byUser = new Map<
      string,
      {
        displayName: string;
        totalPoints: number;
        racesPlayed: number;
        perfectPredictions: number;
        oneOffPredictions: number;
        recentRacePoints: number;
      }
    >();

    for (const m of members) {
      byUser.set(m.user_id, {
        displayName: m.display_name,
        totalPoints: 0,
        racesPlayed: 0,
        perfectPredictions: 0,
        oneOffPredictions: 0,
        recentRacePoints: 0,
      });
    }

    // Layer scores on top
    for (const s of scores) {
      const existing = byUser.get(s.user_id);
      const isPerfect = s.race_position_off === 0;
      const isOneOff = s.race_position_off === 1;
      const isRecentRace = recentRaceId != null && s.race_id === recentRaceId;

      if (existing) {
        existing.totalPoints += s.total_points;
        existing.racesPlayed += 1;
        if (isPerfect) existing.perfectPredictions += 1;
        if (isOneOff) existing.oneOffPredictions += 1;
        if (isRecentRace) existing.recentRacePoints = s.total_points;
      } else {
        byUser.set(s.user_id, {
          displayName:
            (s.profile as { display_name: string } | null)?.display_name ??
            "Unknown",
          totalPoints: s.total_points,
          racesPlayed: 1,
          perfectPredictions: isPerfect ? 1 : 0,
          oneOffPredictions: isOneOff ? 1 : 0,
          recentRacePoints: isRecentRace ? s.total_points : 0,
        });
      }
    }

    if (byUser.size === 0) return [];

    // Convert to array and sort with tiebreakers
    const rows = Array.from(byUser.entries()).map(([userId, data]) => ({
      rank: 0, // assigned after sort
      userId,
      ...data,
    }));

    rows.sort((a, b) => {
      // Primary: total points DESC
      if (b.totalPoints !== a.totalPoints)
        return b.totalPoints - a.totalPoints;
      // Tiebreaker 1: most perfect predictions DESC
      if (b.perfectPredictions !== a.perfectPredictions)
        return b.perfectPredictions - a.perfectPredictions;
      // Tiebreaker 2: most 1-off predictions DESC
      if (b.oneOffPredictions !== a.oneOffPredictions)
        return b.oneOffPredictions - a.oneOffPredictions;
      // Tiebreaker 3: best result in most recent race DESC
      return b.recentRacePoints - a.recentRacePoints;
    });

    // Assign ranks (tied players get the same rank)
    for (let i = 0; i < rows.length; i++) {
      if (
        i === 0 ||
        rows[i].totalPoints !== rows[i - 1].totalPoints ||
        rows[i].perfectPredictions !== rows[i - 1].perfectPredictions ||
        rows[i].oneOffPredictions !== rows[i - 1].oneOffPredictions ||
        rows[i].recentRacePoints !== rows[i - 1].recentRacePoints
      ) {
        rows[i].rank = i + 1;
      } else {
        rows[i].rank = rows[i - 1].rank;
      }
    }

    return rows;
  }, [scores, members, recentRaceId]);

  return { standings, loading, error, refetch: fetchData };
}
