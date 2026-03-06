import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHistory, type HistoryScoreRow } from "@/hooks/useHistory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------- sub-components ----------

/** Formats position as "P1", "P2", etc. or "—" for null */
function pos(p: number | null, isDnf?: boolean): string {
  if (p == null) return "—";
  if (isDnf) return "DNF";
  return `P${p}`;
}

/** Formats signed positions-off: +N (driver beat prediction) / -N (worse) */
function offLabel(
  predicted: number | null,
  actual: number | null,
  isDnf?: boolean
): string {
  if (predicted == null || actual == null) return "—";
  const effectiveActual = isDnf ? 22 : actual;
  const diff = predicted - effectiveActual;
  if (diff === 0) return "Perfect";
  return diff > 0 ? `+${diff}` : String(diff);
}

/** Shared colgroup for the 6-column history tables */
function HistoryColGroup() {
  return (
    <colgroup>
      <col />
      <col />
      <col className="w-12" />
      <col className="w-14" />
      <col className="w-14" />
      <col className="w-10" />
    </colgroup>
  );
}

function ByRaceTable({
  rows,
  currentUserId,
  showSprint,
}: {
  rows: HistoryScoreRow[];
  currentUserId: string | undefined;
  showSprint: boolean;
}) {
  // Sort by total points DESC (best first)
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.totalPoints - a.totalPoints),
    [rows]
  );

  return (
    <div className="space-y-6">
      {/* Main race table */}
      <div>
        {showSprint && (
          <h3 className="text-sm font-medium mb-2">Main Race</h3>
        )}
        <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed min-w-[440px]">
          <HistoryColGroup />
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-2.5">Player</th>
              <th className="text-left py-2.5 ">Driver</th>
              <th className="text-right py-2.5">Pred</th>
              <th className="text-right py-2.5">Actual</th>
              <th className="text-right py-2.5">Off</th>
              <th className="text-right py-2.5">Pts</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const isMe = row.userId === currentUserId;
              return (
                <tr
                  key={row.userId}
                  className={`border-b last:border-0 transition-colors ${
                    isMe
                      ? "bg-primary/5 font-medium"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <td className="py-2 truncate">
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
                  <td className="py-2 text-muted-foreground truncate">
                    {row.driverName}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {pos(row.predictedPosition)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {pos(row.actualPosition, row.isDnf)}
                  </td>
                  <td className="py-2 text-right">
                    {row.positionOff === 0 ? (
                      <Badge
                        variant="default"
                        className="text-xs px-1.5 py-0"
                      >
                        {"\u2713"}
                      </Badge>
                    ) : (
                      <span className="tabular-nums text-muted-foreground">
                        {offLabel(row.predictedPosition, row.actualPosition, row.isDnf)}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums font-semibold">
                    {row.racePoints}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Sprint table (only for sprint weekends) */}
      {showSprint && (
        <div>
          <h3 className="text-sm font-medium mb-2">Sprint Race</h3>
          <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed min-w-[440px]">
            <HistoryColGroup />
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2.5">Player</th>
                <th className="text-left py-2.5 ">Driver</th>
                <th className="text-right py-2.5">Pred</th>
                <th className="text-right py-2.5">Actual</th>
                <th className="text-right py-2.5">Off</th>
                <th className="text-right py-2.5">Pts</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const isMe = row.userId === currentUserId;
                return (
                  <tr
                    key={row.userId}
                    className={`border-b last:border-0 transition-colors ${
                      isMe
                        ? "bg-primary/5 font-medium"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <td className="py-2 truncate">{row.displayName}</td>
                    <td className="py-2 text-muted-foreground truncate">
                      {row.driverName}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {pos(row.sprintPredicted)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {pos(row.sprintActual, row.sprintDnf)}
                    </td>
                    <td className="py-2 text-right">
                      {row.sprintPositionOff === 0 ? (
                        <Badge
                          variant="default"
                          className="text-xs px-1.5 py-0"
                        >
                          {"\u2713"}
                        </Badge>
                      ) : (
                        <span className="tabular-nums text-muted-foreground">
                          {offLabel(row.sprintPredicted, row.sprintActual, row.sprintDnf)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums font-semibold">
                      {row.sprintPoints}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ByPlayerTable({ rows }: { rows: HistoryScoreRow[] }) {
  // Sort chronologically by round number
  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.roundNumber - b.roundNumber),
    [rows]
  );

  const totalPoints = useMemo(
    () => sorted.reduce((sum, r) => sum + r.totalPoints, 0),
    [sorted]
  );

  return (
    <div className="overflow-x-auto">
    <table className="w-full text-sm table-fixed min-w-[440px]">
      <HistoryColGroup />
      <thead>
        <tr className="border-b text-muted-foreground">
          <th className="text-left py-2.5">Race</th>
          <th className="text-left py-2.5 ">Driver</th>
          <th className="text-right py-2.5">Pred</th>
          <th className="text-right py-2.5">Actual</th>
          <th className="text-right py-2.5">Off</th>
          <th className="text-right py-2.5">Pts</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => (
          <>
            {/* Main race row */}
            <tr
              key={row.raceId}
              className="border-b last:border-0 hover:bg-muted/50"
            >
              <td className="py-2 truncate">
                <span className="font-medium">R{row.roundNumber}</span>{" "}
                <span className="text-muted-foreground">{row.raceName}</span>
              </td>
              <td className="py-2 text-muted-foreground truncate">
                {row.driverName}
              </td>
              <td className="py-2 text-right tabular-nums">
                {pos(row.predictedPosition)}
              </td>
              <td className="py-2 text-right tabular-nums">
                {pos(row.actualPosition, row.isDnf)}
              </td>
              <td className="py-2 text-right">
                {row.positionOff === 0 ? (
                  <Badge variant="default" className="text-xs px-1.5 py-0">
                    {"\u2713"}
                  </Badge>
                ) : (
                  <span className="tabular-nums text-muted-foreground">
                    {offLabel(row.predictedPosition, row.actualPosition, row.isDnf)}
                  </span>
                )}
              </td>
              <td className="py-2 text-right tabular-nums font-semibold">
                {row.totalPoints}
              </td>
            </tr>

            {/* Sprint sub-row (inline, right after its race) */}
            {row.isSprintWeekend && (
              <tr
                key={`${row.raceId}-sprint`}
                className="border-b last:border-0 hover:bg-muted/50 text-muted-foreground"
              >
                <td className="py-1.5 pl-4 truncate">
                  <span className="text-xs">└ Sprint</span>
                </td>
                <td className="py-1.5 truncate">
                  {row.driverName}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {pos(row.sprintPredicted)}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {pos(row.sprintActual, row.sprintDnf)}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {offLabel(row.sprintPredicted, row.sprintActual, row.sprintDnf)}
                </td>
                <td className="py-1.5 text-right tabular-nums font-medium">
                  {row.sprintPoints}
                </td>
              </tr>
            )}
          </>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2">
          <td colSpan={5} className="py-3 font-semibold">
            Total
          </td>
          <td className="py-3 text-right tabular-nums font-bold">
            {totalPoints}
          </td>
        </tr>
      </tfoot>
    </table>
    </div>
  );
}

// ---------- page ----------

export default function HistoryPage() {
  const { profile, competitionId } = useAuth();
  const { races, members, scores, loading, error } = useHistory(competitionId);

  const [tab, setTab] = useState<"race" | "player">("race");
  const [selectedRaceId, setSelectedRaceId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Auto-select the most recent completed race once data loads
  useEffect(() => {
    if (races.length > 0 && !selectedRaceId) {
      setSelectedRaceId(races[races.length - 1].id);
    }
  }, [races, selectedRaceId]);

  // Default selected player to current user once members load
  useEffect(() => {
    if (members.length > 0 && !selectedUserId && profile?.id) {
      const isMember = members.some((m) => m.userId === profile.id);
      if (isMember) {
        setSelectedUserId(profile.id);
      }
    }
  }, [members, selectedUserId, profile?.id]);

  // Filtered data for "By Race" tab
  const raceRows = useMemo(
    () =>
      selectedRaceId
        ? scores.filter((s) => s.raceId === selectedRaceId)
        : [],
    [scores, selectedRaceId]
  );

  // Filtered data for "By Player" tab
  const playerRows = useMemo(
    () =>
      selectedUserId
        ? scores.filter((s) => s.userId === selectedUserId)
        : [],
    [scores, selectedUserId]
  );

  // Selected race metadata
  const selectedRace = useMemo(
    () => races.find((r) => r.id === selectedRaceId),
    [races, selectedRaceId]
  );

  // Selected player name
  const selectedPlayerName = useMemo(
    () => members.find((m) => m.userId === selectedUserId)?.displayName ?? "",
    [members, selectedUserId]
  );

  // ---------- loading ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading history…</p>
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

  // ---------- no completed races ----------
  if (races.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-muted-foreground">
            Browse race results and player performance
          </p>
        </div>
        <Card>
          <CardContent className="py-8 text-center space-y-2">
            <p className="text-lg font-medium">No races completed yet</p>
            <p className="text-sm text-muted-foreground">
              Results will appear here after the first race is scored.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- main ----------
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-muted-foreground">
          Browse race results and player performance
        </p>
      </div>

      {/* Tab toggle + dropdown row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Tab toggle */}
        <div className="flex gap-1">
          <Button
            variant={tab === "race" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("race")}
          >
            By Race
          </Button>
          <Button
            variant={tab === "player" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("player")}
          >
            By Player
          </Button>
        </div>

        {/* Dropdown */}
        {tab === "race" ? (
          <Select value={selectedRaceId} onValueChange={setSelectedRaceId}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Select a race" />
            </SelectTrigger>
            <SelectContent>
              {races.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  R{r.round_number} — {r.race_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Select a player" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.displayName}
                  {m.userId === profile?.id ? " (You)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Results card */}
      {tab === "race" ? (
        selectedRaceId ? (
          <Card>
            <CardHeader>
              <CardTitle>
                R{selectedRace?.round_number} — {selectedRace?.race_name}
              </CardTitle>
              <CardDescription>
                {raceRows.length} player{raceRows.length !== 1 ? "s" : ""}
                {selectedRace?.is_sprint_weekend ? " · Sprint weekend" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {raceRows.length > 0 ? (
                <ByRaceTable
                  rows={raceRows}
                  currentUserId={profile?.id}
                  showSprint={selectedRace?.is_sprint_weekend ?? false}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No scores recorded for this race.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Select a race above to view results.
              </p>
            </CardContent>
          </Card>
        )
      ) : selectedUserId ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedPlayerName}
              {selectedUserId === profile?.id ? "'s" : "'s"} History
            </CardTitle>
            <CardDescription>
              {playerRows.length} race{playerRows.length !== 1 ? "s" : ""}{" "}
              scored
            </CardDescription>
          </CardHeader>
          <CardContent>
            {playerRows.length > 0 ? (
              <ByPlayerTable rows={playerRows} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No scores recorded for this player yet.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Select a player above to view their race history.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
