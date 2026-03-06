import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin, type ResultInput } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Race, Driver } from "@/types";

// ---------- helpers ----------

type MessageType = "success" | "error" | "warning";
interface Message {
  type: MessageType;
  text: string;
}

function Alert({ message }: { message: Message }) {
  const colors = {
    success: "bg-green-500/10 text-green-400 border border-green-500/20",
    error: "bg-red-500/10 text-red-400 border border-red-500/20",
    warning: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  };
  return (
    <div className={`rounded-md p-3 text-sm ${colors[message.type]}`}>
      {message.text}
    </div>
  );
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** Convert a timestamptz to a local datetime-local input value */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------- sub-components ----------

function CompetitionStatusCard({
  members,
  assignmentCount,
}: {
  members: { user_id: string; display_name: string }[];
  assignmentCount: number;
}) {
  const hasAssignments = assignmentCount > 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Competition Status</CardTitle>
        <CardDescription>Overview of your competition setup</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Members</span>
          <Badge variant="secondary">
            {members.length} player{members.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Assignments</span>
          <Badge variant={hasAssignments ? "default" : "outline"}>
            {hasAssignments ? `${assignmentCount} rows` : "Not generated"}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Rounds (Latin square)
          </span>
          <Badge variant="secondary">22 of 24</Badge>
        </div>
        {members.length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-sm text-muted-foreground mb-2">Players:</p>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <Badge key={m.user_id} variant="outline">
                  {m.display_name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RaceManagementCard({
  race,
  competitionId,
  resultCount,
  admin,
}: {
  race: Race;
  competitionId: string;
  resultCount: number;
  admin: ReturnType<typeof useAdmin>;
}) {
  const [fetchMsg, setFetchMsg] = useState<Message | null>(null);
  const [lockMsg, setLockMsg] = useState<Message | null>(null);
  const [timerMsg, setTimerMsg] = useState<Message | null>(null);
  const [fetching, setFetching] = useState(false);
  const [locking, setLocking] = useState(false);
  const [confirmUnlock, setConfirmUnlock] = useState<
    "race" | "sprint" | "both" | null
  >(null);
  const [unlocking, setUnlocking] = useState(false);

  // Lock timer local state
  const [raceLockInput, setRaceLockInput] = useState("");
  const [sprintLockInput, setSprintLockInput] = useState("");

  // Effective lock times
  const effectiveRaceLock = race.prediction_lock_time
    ? race.prediction_lock_time
    : race.qualifying_time
      ? new Date(
          new Date(race.qualifying_time).getTime() - 5 * 60_000
        ).toISOString()
      : null;

  const effectiveSprintLock = race.sprint_prediction_lock_time
    ? race.sprint_prediction_lock_time
    : race.sprint_qualifying_time
      ? new Date(
          new Date(race.sprint_qualifying_time).getTime() - 5 * 60_000
        ).toISOString()
      : null;

  const hasCustomRaceLock = !!race.prediction_lock_time;
  const hasCustomSprintLock = !!race.sprint_prediction_lock_time;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Race Management</CardTitle>
        <CardDescription>
          R{race.round_number}: {race.race_name} — Lock timers, predictions, and
          result fetching
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Lock Timer Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Lock Timer Settings</h3>

          {/* Race lock */}
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Race prediction lock
              </span>
              <Badge variant={hasCustomRaceLock ? "default" : "outline"}>
                {hasCustomRaceLock ? "Custom" : "Default"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Locks at: {formatDateTime(effectiveRaceLock)}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="datetime-local"
                value={raceLockInput}
                onChange={(e) => setRaceLockInput(e.target.value)}
                className="w-56"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!raceLockInput}
                onClick={async () => {
                  const res = await admin.updateLockTime(
                    race.id,
                    "prediction_lock_time",
                    new Date(raceLockInput).toISOString()
                  );
                  setTimerMsg({
                    type: res.success ? "success" : "error",
                    text: res.message,
                  });
                  if (res.success) setRaceLockInput("");
                }}
              >
                Set Custom
              </Button>
              {hasCustomRaceLock && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const res = await admin.updateLockTime(
                      race.id,
                      "prediction_lock_time",
                      null
                    );
                    setTimerMsg({
                      type: res.success ? "success" : "error",
                      text: res.message,
                    });
                  }}
                >
                  Reset to Default
                </Button>
              )}
            </div>
          </div>

          {/* Sprint lock (only for sprint weekends) */}
          {race.is_sprint_weekend && (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Sprint prediction lock
                </span>
                <Badge variant={hasCustomSprintLock ? "default" : "outline"}>
                  {hasCustomSprintLock ? "Custom" : "Default"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Locks at: {formatDateTime(effectiveSprintLock)}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  type="datetime-local"
                  value={sprintLockInput}
                  onChange={(e) => setSprintLockInput(e.target.value)}
                  className="w-56"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!sprintLockInput}
                  onClick={async () => {
                    const res = await admin.updateLockTime(
                      race.id,
                      "sprint_prediction_lock_time",
                      new Date(sprintLockInput).toISOString()
                    );
                    setTimerMsg({
                      type: res.success ? "success" : "error",
                      text: res.message,
                    });
                    if (res.success) setSprintLockInput("");
                  }}
                >
                  Set Custom
                </Button>
                {hasCustomSprintLock && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const res = await admin.updateLockTime(
                        race.id,
                        "sprint_prediction_lock_time",
                        null
                      );
                      setTimerMsg({
                        type: res.success ? "success" : "error",
                        text: res.message,
                      });
                    }}
                  >
                    Reset to Default
                  </Button>
                )}
              </div>
            </div>
          )}

          {timerMsg && <Alert message={timerMsg} />}
        </div>

        <div className="border-t" />

        {/* Lock / Unlock Predictions */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Lock / Unlock Predictions</h3>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              size="sm"
              disabled={locking}
              onClick={async () => {
                setLocking(true);
                setLockMsg(null);
                const res = await admin.lockPredictions();
                setLockMsg({
                  type: res.success ? "success" : "error",
                  text: res.message,
                });
                setLocking(false);
              }}
            >
              {locking ? "Locking…" : "Run Lock (all races)"}
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              Unlock this race:
            </span>
            {!confirmUnlock ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmUnlock("race")}
                >
                  Unlock Race
                </Button>
                {race.is_sprint_weekend && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmUnlock("sprint")}
                  >
                    Unlock Sprint
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmUnlock("both")}
                >
                  Unlock{race.is_sprint_weekend ? " Both" : ""}
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-yellow-400">
                  Unlock {confirmUnlock} predictions?
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={unlocking}
                  onClick={async () => {
                    setUnlocking(true);
                    setLockMsg(null);
                    const res = await admin.unlockPredictions(
                      race.id,
                      competitionId,
                      confirmUnlock
                    );
                    setLockMsg({
                      type: res.success ? "success" : "error",
                      text: res.message,
                    });
                    setConfirmUnlock(null);
                    setUnlocking(false);
                  }}
                >
                  {unlocking ? "Unlocking…" : "Yes, unlock"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmUnlock(null)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {lockMsg && <Alert message={lockMsg} />}
        </div>

        <div className="border-t" />

        {/* Fetch Results */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Fetch Results</h3>

          {resultCount > 0 && (
            <div className="rounded-md p-3 text-sm bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              Results already stored ({resultCount} drivers). Fetching again will
              be skipped by the API. Use manual entry below to override.
            </div>
          )}

          <Button
            size="sm"
            disabled={fetching}
            onClick={async () => {
              setFetching(true);
              setFetchMsg(null);
              const res = await admin.fetchResults(race.round_number);
              setFetchMsg({
                type: res.success ? "success" : "error",
                text: res.message,
              });
              setFetching(false);
            }}
          >
            {fetching
              ? "Fetching…"
              : `Fetch Round ${race.round_number} Results`}
          </Button>

          {fetchMsg && <Alert message={fetchMsg} />}
        </div>
      </CardContent>
    </Card>
  );
}

function ResultsEntryCard({
  race,
  drivers,
  existingResults,
  admin,
}: {
  race: Race;
  drivers: Driver[];
  existingResults: ReturnType<typeof useAdmin>["raceResults"];
  admin: ReturnType<typeof useAdmin>;
}) {
  const [resultForm, setResultForm] = useState<Map<string, ResultInput>>(
    new Map()
  );
  const [msg, setMsg] = useState<Message | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialize form from existing results or empty
  useEffect(() => {
    const map = new Map<string, ResultInput>();
    const existingMap = new Map(
      existingResults.map((r) => [r.driver_id, r])
    );

    for (const driver of drivers) {
      const existing = existingMap.get(driver.id);
      map.set(driver.id, {
        driver_id: driver.id,
        finish_position_race: existing?.finish_position_race ?? null,
        finish_position_sprint: existing?.finish_position_sprint ?? null,
        is_dnf_race: existing?.is_dnf_race ?? false,
        is_dnf_sprint: existing?.is_dnf_sprint ?? false,
      });
    }
    setResultForm(map);
  }, [drivers, existingResults]);

  const updateField = (
    driverId: string,
    field: keyof ResultInput,
    value: any
  ) => {
    setResultForm((prev) => {
      const next = new Map(prev);
      const row = next.get(driverId);
      if (row) {
        next.set(driverId, { ...row, [field]: value });
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);

    // Only save rows that have at least one position filled
    const rows = Array.from(resultForm.values()).filter(
      (r) => r.finish_position_race != null || r.finish_position_sprint != null
    );

    if (rows.length === 0) {
      setMsg({ type: "warning", text: "No positions entered." });
      setSaving(false);
      return;
    }

    const res = await admin.saveResults(race.id, rows);
    setMsg({ type: res.success ? "success" : "error", text: res.message });
    setSaving(false);
  };

  const isSprint = race.is_sprint_weekend;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results Entry</CardTitle>
        <CardDescription>
          Enter or override finish positions for R{race.round_number}:{" "}
          {race.race_name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 pr-2">Driver</th>
                <th className="text-center py-2 px-1 w-16">Race Pos</th>
                <th className="text-center py-2 px-1 w-14">DNF</th>
                {isSprint && (
                  <>
                    <th className="text-center py-2 px-1 w-16">Sprint Pos</th>
                    <th className="text-center py-2 px-1 w-14">DNF</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => {
                const row = resultForm.get(driver.id);
                if (!row) return null;
                return (
                  <tr
                    key={driver.id}
                    className="border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-1.5 pr-2">
                      <span className="font-medium">{driver.full_name}</span>
                      <span className="text-xs text-muted-foreground ml-1.5">
                        {driver.abbreviation}
                      </span>
                    </td>
                    <td className="py-1.5 px-1">
                      <Input
                        type="number"
                        min={1}
                        max={22}
                        placeholder="—"
                        value={row.finish_position_race ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateField(
                            driver.id,
                            "finish_position_race",
                            val === "" ? null : parseInt(val, 10)
                          );
                        }}
                        className="w-16 h-8 text-center text-sm px-1"
                      />
                    </td>
                    <td className="py-1.5 px-1 text-center">
                      <Checkbox
                        checked={row.is_dnf_race}
                        onCheckedChange={(checked) =>
                          updateField(driver.id, "is_dnf_race", !!checked)
                        }
                      />
                    </td>
                    {isSprint && (
                      <>
                        <td className="py-1.5 px-1">
                          <Input
                            type="number"
                            min={1}
                            max={22}
                            placeholder="—"
                            value={row.finish_position_sprint ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateField(
                                driver.id,
                                "finish_position_sprint",
                                val === "" ? null : parseInt(val, 10)
                              );
                            }}
                            className="w-16 h-8 text-center text-sm px-1"
                          />
                        </td>
                        <td className="py-1.5 px-1 text-center">
                          <Checkbox
                            checked={row.is_dnf_sprint}
                            onCheckedChange={(checked) =>
                              updateField(
                                driver.id,
                                "is_dnf_sprint",
                                !!checked
                              )
                            }
                          />
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {msg && (
          <div className="mt-4">
            <Alert message={msg} />
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Results"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function AssignmentsCard({
  assignmentCount,
  memberCount,
  raceAssignments,
  raceLoading,
  selectedRace,
  admin,
}: {
  assignmentCount: number;
  memberCount: number;
  raceAssignments: ReturnType<typeof useAdmin>["raceAssignments"];
  raceLoading: boolean;
  selectedRace: Race | null;
  admin: ReturnType<typeof useAdmin>;
}) {
  const [msg, setMsg] = useState<Message | null>(null);
  const [generating, setGenerating] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const hasAssignments = assignmentCount > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Driver Assignments</CardTitle>
        <CardDescription>
          Generate the Latin square rotation for all 22 rounds. Each player gets
          every driver exactly once.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {msg && <Alert message={msg} />}

        {hasAssignments && !confirmReset && (
          <div className="rounded-md p-3 text-sm bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            Assignments have already been generated ({assignmentCount} rows for{" "}
            {memberCount} players). The game is ready to play!
          </div>
        )}

        {memberCount === 0 && (
          <div className="rounded-md p-3 text-sm bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            No players have joined yet. Share the invite code first.
          </div>
        )}

        <div className="flex gap-3">
          {!hasAssignments ? (
            <Button
              onClick={async () => {
                setGenerating(true);
                setMsg(null);
                const res = await admin.generateAssignments();
                setMsg({
                  type: res.success ? "success" : "error",
                  text: res.message,
                });
                setGenerating(false);
              }}
              disabled={generating || memberCount === 0}
            >
              {generating ? "Generating…" : "Generate Assignments"}
            </Button>
          ) : (
            <>
              {!confirmReset ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmReset(true)}
                >
                  Reset Assignments
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-red-400">
                    Are you sure? This deletes all assignments.
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={resetting}
                    onClick={async () => {
                      setResetting(true);
                      setMsg(null);
                      const res = await admin.resetAssignments();
                      setMsg({
                        type: res.success ? "success" : "error",
                        text: res.message,
                      });
                      setConfirmReset(false);
                      setResetting(false);
                    }}
                  >
                    {resetting ? "Deleting…" : "Yes, delete"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmReset(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Assignments table for selected race */}
        {selectedRace && hasAssignments && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-2">
              Assignments for R{selectedRace.round_number}:{" "}
              {selectedRace.race_name}
            </h3>
            {raceLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : raceAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No assignments found for this race.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2">Player</th>
                    <th className="text-left py-2">Driver</th>
                    <th className="text-left py-2 hidden sm:table-cell">
                      Team
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {raceAssignments.map((a) => (
                    <tr
                      key={a.user_id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-1.5">{a.display_name}</td>
                      <td className="py-1.5">
                        {a.driver_name}
                        <span className="text-xs text-muted-foreground ml-1.5">
                          {a.driver_abbreviation}
                        </span>
                      </td>
                      <td className="py-1.5 text-muted-foreground hidden sm:table-cell">
                        {a.driver_team}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreCalculationCard({
  race,
  resultCount,
  admin,
}: {
  race: Race;
  resultCount: number;
  admin: ReturnType<typeof useAdmin>;
}) {
  const [msg, setMsg] = useState<Message | null>(null);
  const [calculating, setCalculating] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score Calculation</CardTitle>
        <CardDescription>
          Manually trigger score calculation for R{race.round_number}:{" "}
          {race.race_name}. Normally happens automatically after fetching
          results.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {resultCount === 0 && (
          <div className="rounded-md p-3 text-sm bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            No results found for this race. Fetch or enter results first.
          </div>
        )}

        <Button
          size="sm"
          disabled={calculating || resultCount === 0}
          onClick={async () => {
            setCalculating(true);
            setMsg(null);
            const res = await admin.calculateScores(race.id);
            setMsg({
              type: res.success ? "success" : "error",
              text: res.message,
            });
            setCalculating(false);
          }}
        >
          {calculating
            ? "Calculating…"
            : `Calculate Scores for Round ${race.round_number}`}
        </Button>

        {msg && <Alert message={msg} />}
      </CardContent>
    </Card>
  );
}

// ---------- main page ----------

export default function AdminPage() {
  const { competitionId, profile } = useAuth();
  const [selectedRaceId, setSelectedRaceId] = useState("");

  const admin = useAdmin(competitionId, selectedRaceId);
  const {
    races,
    drivers,
    members,
    assignmentCount,
    raceResults,
    raceAssignments,
    loading,
    raceLoading,
    error,
  } = admin;

  // Auto-select most relevant race: first active, then first upcoming, then last completed
  useEffect(() => {
    if (races.length > 0 && !selectedRaceId) {
      const active = races.find((r) => r.status === "active");
      if (active) {
        setSelectedRaceId(active.id);
        return;
      }
      const upcoming = races.find((r) => r.status === "upcoming");
      if (upcoming) {
        setSelectedRaceId(upcoming.id);
        return;
      }
      const completed = [...races]
        .filter((r) => r.status === "completed")
        .pop();
      if (completed) {
        setSelectedRaceId(completed.id);
      }
    }
  }, [races, selectedRaceId]);

  const selectedRace = useMemo(
    () => races.find((r) => r.id === selectedRaceId) ?? null,
    [races, selectedRaceId]
  );

  // ---------- guards ----------

  if (!profile?.is_admin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">
          You do not have admin access.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading admin panel…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group races by status for the selector
  const activeRaces = races.filter((r) => r.status === "active");
  const upcomingRaces = races.filter((r) => r.status === "upcoming");
  const completedRaces = races.filter((r) => r.status === "completed");

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      {/* Race selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground shrink-0">
          Manage race:
        </span>
        <Select value={selectedRaceId} onValueChange={setSelectedRaceId}>
          <SelectTrigger className="w-full sm:w-[280px]">
            <SelectValue placeholder="Select a race…" />
          </SelectTrigger>
          <SelectContent>
            {activeRaces.length > 0 && (
              <>
                {activeRaces.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    R{r.round_number}: {r.race_name}{" "}
                    {r.is_sprint_weekend ? "🏃" : ""} — Active
                  </SelectItem>
                ))}
              </>
            )}
            {upcomingRaces.length > 0 && (
              <>
                {upcomingRaces.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    R{r.round_number}: {r.race_name}{" "}
                    {r.is_sprint_weekend ? "🏃" : ""}
                  </SelectItem>
                ))}
              </>
            )}
            {completedRaces.length > 0 && (
              <>
                {completedRaces.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    R{r.round_number}: {r.race_name}{" "}
                    {r.is_sprint_weekend ? "🏃" : ""} — Completed
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Card 1: Competition Status */}
      <CompetitionStatusCard
        members={members}
        assignmentCount={assignmentCount}
      />

      {/* Remaining cards require a selected race */}
      {selectedRace ? (
        <>
          {/* Card 2: Race Management */}
          <RaceManagementCard
            race={selectedRace}
            competitionId={competitionId!}
            resultCount={raceResults.length}
            admin={admin}
          />

          {/* Card 3: Results Entry */}
          <ResultsEntryCard
            race={selectedRace}
            drivers={drivers}
            existingResults={raceResults}
            admin={admin}
          />

          {/* Card 4: Assignments */}
          <AssignmentsCard
            assignmentCount={assignmentCount}
            memberCount={members.length}
            raceAssignments={raceAssignments}
            raceLoading={raceLoading}
            selectedRace={selectedRace}
            admin={admin}
          />

          {/* Card 5: Score Calculation */}
          <ScoreCalculationCard
            race={selectedRace}
            resultCount={raceResults.length}
            admin={admin}
          />
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Select a race above to manage it.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
