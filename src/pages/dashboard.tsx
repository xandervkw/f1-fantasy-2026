import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentRace, type GridEntry } from "@/hooks/useCurrentRace";
import { usePrediction } from "@/hooks/usePrediction";
import { useCountdown, type CountdownResult } from "@/hooks/useCountdown";
import { resolveFinishPosition } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

// ---------- helpers ----------

function formatCountdown(c: CountdownResult): string {
  if (c.isExpired) return "Deadline passed";
  const parts: string[] = [];
  if (c.days > 0) parts.push(`${c.days}d`);
  parts.push(`${String(c.hours).padStart(2, "0")}h`);
  parts.push(`${String(c.minutes).padStart(2, "0")}m`);
  parts.push(`${String(c.seconds).padStart(2, "0")}s`);
  return parts.join(" ");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPosition(pos: number | null | undefined): string {
  if (pos == null) return "—";
  return `P${pos}`;
}

// ---------- sub-components ----------

function PredictionSection({
  label,
  countdown,
  position,
  setPosition,
  isLocked,
  adminUnlocked,
  onSubmit,
  saving,
  existingPosition,
  savedAt,
}: {
  label: string;
  countdown: CountdownResult;
  position: string;
  setPosition: (v: string) => void;
  isLocked: boolean;
  adminUnlocked: boolean;
  onSubmit: () => void;
  saving: boolean;
  existingPosition: number | null | undefined;
  savedAt: string | null;
}) {
  const posNum = parseInt(position, 10);
  const isValid = !isNaN(posNum) && posNum >= 1 && posNum <= 22;
  const hasChanged =
    existingPosition != null ? posNum !== existingPosition : position !== "";

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label} Prediction</h3>
        {isLocked ? (
          <Badge variant="secondary">Locked</Badge>
        ) : !countdown.isExpired ? (
          <Badge variant="outline" className="font-mono text-xs">
            {formatCountdown(countdown)}
          </Badge>
        ) : adminUnlocked ? (
          <Badge variant="default" className="bg-green-600 text-xs">
            Open
          </Badge>
        ) : (
          <Badge variant="secondary">Locked</Badge>
        )}
      </div>

      {isLocked ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Your prediction
            </span>
            <span className="font-semibold">
              {existingPosition != null ? (
                formatPosition(existingPosition)
              ) : (
                <Badge variant="destructive">Missed</Badge>
              )}
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              max={22}
              placeholder="1–22"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">
              Predicted finishing position
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={onSubmit}
              disabled={!isValid || saving || !hasChanged}
              size="sm"
            >
              {saving
                ? "Saving…"
                : existingPosition != null
                  ? "Update"
                  : "Submit"}
            </Button>
            {savedAt && (
              <span className="text-xs text-muted-foreground">
                Last saved {new Date(savedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsSection({
  label,
  predictedPosition,
  actualPosition,
  isDnf,
  points,
}: {
  label: string;
  predictedPosition: number | null | undefined;
  actualPosition: number | null | undefined;
  isDnf: boolean;
  points: number;
}) {
  const resolvedPosition =
    actualPosition != null
      ? resolveFinishPosition(actualPosition, isDnf)
      : null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{label} Result</h3>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Your prediction</span>
        <span className="font-medium">
          {predictedPosition != null ? (
            formatPosition(predictedPosition)
          ) : (
            <Badge variant="destructive">Missed</Badge>
          )}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Actual finish</span>
        <span className="font-medium">
          {resolvedPosition != null ? (
            <span className="flex items-center gap-2">
              P{resolvedPosition}
              {isDnf && <Badge variant="destructive">DNF</Badge>}
            </span>
          ) : (
            "—"
          )}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Points earned</span>
        <Badge variant="default">{points} pts</Badge>
      </div>
    </div>
  );
}

function RaceGridCard({
  grid,
  currentUserId,
  showRacePredictions,
  showSprintPredictions,
}: {
  grid: GridEntry[];
  currentUserId: string;
  showRacePredictions: boolean;
  showSprintPredictions: boolean;
}) {
  const showAnyPredictions = showRacePredictions || showSprintPredictions;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Race Grid</CardTitle>
        <CardDescription>
          Driver assignments{showAnyPredictions ? " & predictions" : ""} for
          this round
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className={`w-full text-sm table-fixed ${showAnyPredictions ? "min-w-[480px]" : "min-w-[340px]"}`}>
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="text-left font-normal pb-2 w-[30%]">Player</th>
                <th className="text-left font-normal pb-2">Driver</th>
                <th className="text-left font-normal pb-2 w-[90px]">Team</th>
                {showSprintPredictions && (
                  <th className="text-center font-normal pb-2 w-[56px]">Sprint</th>
                )}
                {showRacePredictions && (
                  <th className="text-center font-normal pb-2 w-[56px]">Race</th>
                )}
              </tr>
            </thead>
            <tbody>
              {grid.map((entry) => {
                const isMe = entry.user_id === currentUserId;
                return (
                  <tr
                    key={entry.user_id}
                    className={isMe ? "bg-primary/10" : ""}
                  >
                    <td className={`py-1.5 px-2 rounded-l-md ${isMe ? "font-semibold" : ""}`}>
                      {entry.display_name}
                      {isMe && (
                        <span className="ml-1 text-xs text-muted-foreground font-normal">
                          (you)
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 font-medium">
                      {entry.driver_name}
                    </td>
                    <td className="py-1.5 px-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.driver_team}
                      </Badge>
                    </td>
                    {showSprintPredictions && (
                      <td className="py-1.5 px-2 text-center">
                        <Badge
                          variant={
                            entry.predicted_position_sprint !== null
                              ? "secondary"
                              : "ghost"
                          }
                          className="w-10 justify-center text-xs"
                        >
                          {entry.predicted_position_sprint !== null
                            ? `P${entry.predicted_position_sprint}`
                            : "—"}
                        </Badge>
                      </td>
                    )}
                    {showRacePredictions && (
                      <td className="py-1.5 px-2 text-center rounded-r-md">
                        <Badge
                          variant={
                            entry.predicted_position_race !== null
                              ? "secondary"
                              : "ghost"
                          }
                          className="w-10 justify-center text-xs"
                        >
                          {entry.predicted_position_race !== null
                            ? `P${entry.predicted_position_race}`
                            : "—"}
                        </Badge>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- main page ----------

type ViewMode =
  | "loading"
  | "error"
  | "no_race"
  | "no_assignment"
  | "race_active";

export default function DashboardPage() {
  const { user, profile, competitionId } = useAuth();
  const {
    race,
    assignment,
    result,
    score,
    raceGrid,
    loading: raceLoading,
    error: raceError,
  } = useCurrentRace();
  const {
    prediction,
    loading: predLoading,
    saving,
    error: predError,
    submitPrediction,
  } = usePrediction(race?.id ?? null, competitionId);

  // Countdown timers — use custom lock time if set, otherwise default to 5 min before qualifying
  const raceDeadline = useMemo(() => {
    if (!race) return null;
    if (race.prediction_lock_time) return new Date(race.prediction_lock_time);
    if (race.qualifying_time)
      return new Date(new Date(race.qualifying_time).getTime() - 5 * 60_000);
    return null;
  }, [race?.prediction_lock_time, race?.qualifying_time]);

  const sprintDeadline = useMemo(() => {
    if (!race) return null;
    if (race.sprint_prediction_lock_time)
      return new Date(race.sprint_prediction_lock_time);
    if (race.sprint_qualifying_time)
      return new Date(
        new Date(race.sprint_qualifying_time).getTime() - 5 * 60_000
      );
    return null;
  }, [race?.sprint_prediction_lock_time, race?.sprint_qualifying_time]);

  const raceCountdown = useCountdown(raceDeadline);
  const sprintCountdown = useCountdown(sprintDeadline);

  // Form state
  const [racePosition, setRacePosition] = useState("");
  const [sprintPosition, setSprintPosition] = useState("");
  const [submitMessage, setSubmitMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Sync form state from loaded prediction
  useEffect(() => {
    if (prediction) {
      setRacePosition(prediction.predicted_position_race?.toString() ?? "");
      setSprintPosition(
        prediction.predicted_position_sprint?.toString() ?? ""
      );
    }
  }, [prediction]);

  // Determine view mode
  const viewMode: ViewMode = useMemo(() => {
    if (raceLoading || predLoading) return "loading";
    if (raceError) return "error";
    if (!race) return "no_race";
    if (!assignment) return "no_assignment";
    return "race_active";
  }, [race, assignment, raceLoading, predLoading, raceError]);

  // Locking logic — three layers:
  //   1. Completed race → always locked
  //   2. Admin unlock flag → always open (overrides timer + DB flag)
  //   3. Otherwise: locked if DB flag says locked OR countdown expired
  //      (countdown acts as client-side safeguard before cron sets DB flag)
  const isRaceLocked =
    race?.status === "completed" ||
    (!race?.admin_race_unlocked &&
      (prediction?.is_locked || raceCountdown.isExpired));
  const isSprintLocked =
    race?.status === "completed" ||
    (!race?.admin_sprint_unlocked &&
      (prediction?.is_sprint_locked || sprintCountdown.isExpired));

  // Submit handlers
  async function handleSubmitRace() {
    const pos = parseInt(racePosition, 10);
    if (isNaN(pos) || pos < 1 || pos > 22) return;
    setSubmitMessage(null);
    const res = await submitPrediction(
      pos,
      prediction?.predicted_position_sprint ?? null
    );
    if (res.error) {
      setSubmitMessage({ type: "error", text: res.error });
    } else {
      setSubmitMessage({ type: "success", text: "Race prediction saved!" });
    }
  }

  async function handleSubmitSprint() {
    const pos = parseInt(sprintPosition, 10);
    if (isNaN(pos) || pos < 1 || pos > 22) return;
    setSubmitMessage(null);
    const res = await submitPrediction(
      prediction?.predicted_position_race ?? null,
      pos
    );
    if (res.error) {
      setSubmitMessage({ type: "error", text: res.error });
    } else {
      setSubmitMessage({ type: "success", text: "Sprint prediction saved!" });
    }
  }

  // Status badge for race
  function getStatusBadge() {
    if (!race) return null;
    switch (race.status) {
      case "upcoming":
        return <Badge variant="outline">Upcoming</Badge>;
      case "active":
        return <Badge variant="default">Race Weekend</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
    }
  }

  // ---------- render ----------

  if (viewMode === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (viewMode === "error") {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-400">{raceError}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try refreshing the page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewMode === "no_race") {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
        <h1 className="text-2xl font-bold">F1 Fantasy 2026</h1>
        <Card>
          <CardContent className="py-8 text-center space-y-2">
            <p className="text-lg font-medium">Season Complete!</p>
            <p className="text-sm text-muted-foreground">
              All races have been completed. Check the final standings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewMode === "no_assignment") {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
        <h1 className="text-2xl font-bold">F1 Fantasy 2026</h1>
        <p className="text-muted-foreground">
          Welcome, {profile?.display_name}
        </p>
        <Card>
          <CardHeader>
            <CardTitle>
              Round {race!.round_number}: {race!.race_name}
            </CardTitle>
            <CardDescription>
              {race!.circuit} — {formatDate(race!.race_date)}
            </CardDescription>
          </CardHeader>
          <CardContent className="py-4 text-center space-y-2">
            <p className="text-muted-foreground">
              Driver assignments haven't been generated yet.
            </p>
            <p className="text-sm text-muted-foreground">
              The admin needs to start the season from the admin panel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // viewMode === "race_active" — main dashboard content
  const isCompleted = race!.status === "completed";
  const isSprint = race!.is_sprint_weekend;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">F1 Fantasy 2026</h1>
          <p className="text-muted-foreground">
            Welcome, {profile?.display_name}
          </p>
        </div>
        {getStatusBadge()}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Round {race!.round_number}: {race!.race_name}
            </CardTitle>
            {isSprint && <Badge variant="outline">Sprint Weekend</Badge>}
          </div>
          <CardDescription>
            {race!.circuit} — {formatDate(race!.race_date)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Driver reveal */}
          <div className="rounded-lg bg-muted/50 p-4 text-center space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Your assigned driver
            </p>
            <p className="text-xl font-bold">{assignment!.driver.full_name}</p>
            <Badge variant="outline">{assignment!.driver.team}</Badge>
          </div>

          {/* Submit message */}
          {submitMessage && (
            <div
              className={`rounded-md p-3 text-sm ${
                submitMessage.type === "success"
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {submitMessage.text}
            </div>
          )}

          {/* Prediction error */}
          {predError && !submitMessage && (
            <div className="rounded-md p-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20">
              {predError}
            </div>
          )}

          {/* Sprint prediction (only for sprint weekends) */}
          {isSprint && !isCompleted && (
            <PredictionSection
              label="Sprint"
              countdown={sprintCountdown}
              position={sprintPosition}
              setPosition={setSprintPosition}
              isLocked={!!isSprintLocked}
              adminUnlocked={!!race?.admin_sprint_unlocked}
              onSubmit={handleSubmitSprint}
              saving={saving}
              existingPosition={prediction?.predicted_position_sprint}
              savedAt={
                prediction?.predicted_position_sprint != null
                  ? prediction.submitted_at
                  : null
              }
            />
          )}

          {/* Race prediction */}
          {!isCompleted && (
            <PredictionSection
              label="Race"
              countdown={raceCountdown}
              position={racePosition}
              setPosition={setRacePosition}
              isLocked={!!isRaceLocked}
              adminUnlocked={!!race?.admin_race_unlocked}
              onSubmit={handleSubmitRace}
              saving={saving}
              existingPosition={prediction?.predicted_position_race}
              savedAt={
                prediction?.predicted_position_race != null
                  ? prediction.submitted_at
                  : null
              }
            />
          )}

          {/* Completed race results */}
          {isCompleted && (
            <div className="space-y-4">
              {result ? (
                <>
                  {isSprint && (
                    <ResultsSection
                      label="Sprint"
                      predictedPosition={
                        prediction?.predicted_position_sprint
                      }
                      actualPosition={result.finish_position_sprint}
                      isDnf={result.is_dnf_sprint}
                      points={score?.sprint_points ?? 0}
                    />
                  )}
                  <ResultsSection
                    label="Race"
                    predictedPosition={prediction?.predicted_position_race}
                    actualPosition={result.finish_position_race}
                    isDnf={result.is_dnf_race}
                    points={score?.race_points ?? 0}
                  />
                  {score && (
                    <div className="border-t pt-3 flex items-center justify-between">
                      <span className="font-semibold">Total Points</span>
                      <Badge
                        variant="default"
                        className="text-base px-3 py-1"
                      >
                        {score.total_points} pts
                      </Badge>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-md p-3 text-sm bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-center">
                  Awaiting results — the admin will enter them after the race.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Race grid — all players' driver assignments + locked predictions */}
      {raceGrid.length > 0 && user && (
        <RaceGridCard
          grid={raceGrid}
          currentUserId={user.id}
          showRacePredictions={raceGrid.some(
            (e) => e.predicted_position_race !== null
          )}
          showSprintPredictions={
            !!race?.is_sprint_weekend &&
            raceGrid.some((e) => e.predicted_position_sprint !== null)
          }
        />
      )}
    </div>
  );
}
