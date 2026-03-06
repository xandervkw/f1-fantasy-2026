import { useAuth } from "@/hooks/useAuth";
import { useStandings } from "@/hooks/useStandings";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

// ---------- helpers ----------

const MEDALS = ["", "\u{1F947}", "\u{1F948}", "\u{1F949}"]; // 🥇🥈🥉

function getMedal(rank: number): string {
  return MEDALS[rank] ?? "";
}

// ---------- page ----------

export default function StandingsPage() {
  const { profile, competitionId } = useAuth();
  const { standings, loading, error } = useStandings(competitionId);

  // ---------- loading ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading standings…</p>
        </div>
      </div>
    );
  }

  // ---------- error ----------
  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-400">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try refreshing the page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- empty ----------
  if (standings.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
        <h1 className="text-2xl font-bold">Standings</h1>
        <Card>
          <CardContent className="py-8 text-center space-y-2">
            <p className="text-lg font-medium">No players yet</p>
            <p className="text-sm text-muted-foreground">
              Standings will appear once players join the competition.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasScores = standings.some((r) => r.racesPlayed > 0);

  // ---------- main ----------
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Standings</h1>
        <p className="text-muted-foreground">
          Season leaderboard — updated live
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>F1 Fantasy 2026</CardTitle>
          <CardDescription>
            {standings.length} player{standings.length !== 1 ? "s" : ""}
            {hasScores
              ? ` · ${standings[0]?.racesPlayed ?? 0} race${(standings[0]?.racesPlayed ?? 0) !== 1 ? "s" : ""} scored`
              : " · Season not started"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed min-w-[380px]">
            <colgroup>
              <col className="w-10" />
              <col />
              <col className="w-14" />
              <col className="w-14" />
              <col className="w-16" />
            </colgroup>
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2.5">#</th>
                <th className="text-left py-2.5">Player</th>
                <th className="text-right py-2.5">Pts</th>
                <th className="text-right py-2.5">Races</th>
                <th className="text-right py-2.5">Perfect</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => {
                const isMe = row.userId === profile?.id;
                const medal = getMedal(row.rank);

                return (
                  <tr
                    key={row.userId}
                    className={`border-b last:border-0 transition-colors ${
                      isMe
                        ? "bg-primary/5 font-medium"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <td className="py-2.5 tabular-nums">
                      {medal ? (
                        <span className="text-base">{medal}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {row.rank}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 truncate">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="truncate">{row.displayName}</span>
                        {isMe && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 shrink-0"
                          >
                            You
                          </Badge>
                        )}
                      </span>
                    </td>

                    <td className="py-2.5 text-right tabular-nums font-semibold">
                      {row.totalPoints}
                    </td>

                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {row.racesPlayed}
                    </td>

                    <td className="py-2.5 text-right tabular-nums">
                      {row.perfectPredictions > 0 ? (
                        <Badge
                          variant="default"
                          className="text-xs px-1.5 py-0"
                        >
                          {row.perfectPredictions}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
