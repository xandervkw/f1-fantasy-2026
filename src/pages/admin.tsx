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
import { Switch } from "@/components/ui/switch";
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

// ---------- sub-components ----------

function CompetitionStatusCard({
  members,
  assignmentCount,
  acceptingMembers,
  onToggleAccepting,
}: {
  members: { user_id: string; display_name: string }[];
  assignmentCount: number;
  acceptingMembers: boolean;
  onToggleAccepting: (value: boolean) => void;
}) {
  const hasAssignments = assignmentCount > 0;
  const isFull = members.length >= 22;
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
            {members.length} / 22 player{members.length !== 1 ? "s" : ""}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Accepting new members
            </span>
            {isFull && (
              <span className="text-xs text-yellow-400">(Full)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={acceptingMembers ? "default" : "destructive"}
              className={
                acceptingMembers
                  ? "bg-green-500/15 text-green-400 border-green-500/30"
                  : ""
              }
            >
              {acceptingMembers ? "Open" : "Closed"}
            </Badge>
            <Switch
              checked={acceptingMembers}
              onCheckedChange={onToggleAccepting}
              disabled={isFull && !acceptingMembers}
            />
          </div>
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
  const [toggling, setToggling] = useState(false);

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
                className="w-full sm:w-56"
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
                  className="w-full sm:w-56"
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
          <h3 className="text-sm font-semibold">Prediction Locks</h3>

          {/* Race lock toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Race predictions</p>
              <p className="text-xs text-muted-foreground">
                {race.admin_race_unlocked ? "Unlocked by admin" : "Locked"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {race.admin_race_unlocked ? "Open" : "Locked"}
              </span>
              <Switch
                checked={!race.admin_race_unlocked}
                disabled={toggling}
                onCheckedChange={async (locked) => {
                  setToggling(true);
                  setLockMsg(null);
                  const res = locked
                    ? await admin.lockPredictions(race.id, competitionId, "race")
                    : await admin.unlockPredictions(race.id, competitionId, "race");
                  setLockMsg({
                    type: res.success ? "success" : "error",
                    text: res.message,
                  });
                  setToggling(false);
                }}
              />
            </div>
          </div>

          {/* Sprint lock toggle (only for sprint weekends) */}
          {race.is_sprint_weekend && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Sprint predictions</p>
                <p className="text-xs text-muted-foreground">
                  {race.admin_sprint_unlocked ? "Unlocked by admin" : "Locked"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {race.admin_sprint_unlocked ? "Open" : "Locked"}
                </span>
                <Switch
                  checked={!race.admin_sprint_unlocked}
                  disabled={toggling}
                  onCheckedChange={async (locked) => {
                    setToggling(true);
                    setLockMsg(null);
                    const res = locked
                      ? await admin.lockPredictions(race.id, competitionId, "sprint")
                      : await admin.unlockPredictions(race.id, competitionId, "sprint");
                    setLockMsg({
                      type: res.success ? "success" : "error",
                      text: res.message,
                    });
                    setToggling(false);
                  }}
                />
              </div>
            </div>
          )}

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

/** Validate a list of positions: no duplicates, 1–maxPos, no gaps */
function validatePositions(
  positions: Array<{ driverId: string; pos: number }>,
  label: string,
  maxPos: number
): { errors: string[]; duplicatePositions: Set<number>; outOfRange: Set<number> } {
  const errors: string[] = [];
  const duplicatePositions = new Set<number>();
  const outOfRange = new Set<number>();

  if (positions.length === 0) return { errors, duplicatePositions, outOfRange };

  // Range check (dynamic max based on DNF count)
  for (const p of positions) {
    if (p.pos < 1 || p.pos > maxPos) {
      outOfRange.add(p.pos);
      errors.push(
        `${label}: P${p.pos} is out of range (must be 1–${maxPos}).`
      );
    }
  }

  // Duplicate check
  const seen = new Map<number, number>();
  for (const p of positions) {
    seen.set(p.pos, (seen.get(p.pos) ?? 0) + 1);
  }
  for (const [pos, count] of seen) {
    if (count > 1) {
      duplicatePositions.add(pos);
      errors.push(`${label}: P${pos} is used ${count} times.`);
    }
  }

  // Gap check — positions must be contiguous from 1
  const sorted = [...positions].map((p) => p.pos).sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    const expected = i + 1;
    if (sorted[i] !== expected) {
      errors.push(
        `${label}: Gap — P${expected} is missing (positions must be contiguous from P1).`
      );
      break;
    }
  }

  return { errors, duplicatePositions, outOfRange };
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

  // Live validation
  const validation = useMemo(() => {
    const rows = Array.from(resultForm.values());

    // Count DNFs to compute dynamic max position
    const totalDnfRace = rows.filter((r) => r.is_dnf_race).length;
    const raceMaxPos = drivers.length - totalDnfRace;

    // Race positions (only non-DNF drivers with a position entered)
    const racePositions = rows
      .filter((r) => r.finish_position_race != null && !r.is_dnf_race)
      .map((r) => ({
        driverId: r.driver_id,
        pos: r.finish_position_race!,
      }));

    const raceVal = validatePositions(racePositions, "Race", raceMaxPos);

    // Sprint positions
    const totalDnfSprint = rows.filter((r) => r.is_dnf_sprint).length;
    const sprintMaxPos = drivers.length - totalDnfSprint;

    let sprintVal = {
      errors: [] as string[],
      duplicatePositions: new Set<number>(),
      outOfRange: new Set<number>(),
    };
    if (race.is_sprint_weekend) {
      const sprintPositions = rows
        .filter((r) => r.finish_position_sprint != null && !r.is_dnf_sprint)
        .map((r) => ({
          driverId: r.driver_id,
          pos: r.finish_position_sprint!,
        }));
      sprintVal = validatePositions(sprintPositions, "Sprint", sprintMaxPos);
    }

    // Check completeness
    const totalWithRacePos = racePositions.length;
    const totalAccountedFor = totalWithRacePos + totalDnfRace;
    const raceComplete = totalAccountedFor === drivers.length && totalWithRacePos > 0;

    return {
      raceErrors: raceVal.errors,
      sprintErrors: sprintVal.errors,
      raceDuplicates: raceVal.duplicatePositions,
      sprintDuplicates: sprintVal.duplicatePositions,
      raceOutOfRange: raceVal.outOfRange,
      sprintOutOfRange: sprintVal.outOfRange,
      allErrors: [...raceVal.errors, ...sprintVal.errors],
      isValid: raceVal.errors.length === 0 && sprintVal.errors.length === 0,
      raceComplete,
      raceFilled: totalWithRacePos,
      raceDnf: totalDnfRace,
      raceMaxPos,
      sprintMaxPos,
    };
  }, [resultForm, race.is_sprint_weekend, drivers.length]);

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
    // Validate before saving
    if (!validation.isValid) {
      setMsg({
        type: "error",
        text: validation.allErrors.join(" "),
      });
      return;
    }

    setSaving(true);
    setMsg(null);

    // Save rows that have a position OR a DNF flag checked
    const rows = Array.from(resultForm.values()).filter(
      (r) =>
        r.finish_position_race != null ||
        r.finish_position_sprint != null ||
        r.is_dnf_race ||
        r.is_dnf_sprint
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
          {validation.raceFilled > 0 && (
            <span className="ml-2">
              — {validation.raceFilled} positions, {validation.raceDnf} DNFs
              {validation.raceComplete ? " ✓" : ` (${drivers.length - validation.raceFilled - validation.raceDnf} missing)`}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Validation errors */}
        {validation.allErrors.length > 0 && (
          <div className="mb-4 rounded-md p-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20 space-y-1">
            {validation.allErrors.map((err: string, i: number) => (
              <p key={i}>⚠ {err}</p>
            ))}
          </div>
        )}

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 pr-2">Driver</th>
                <th className="text-center py-2 px-1 w-16">Pos</th>
                <th className="text-center py-2 px-1 w-12">DNF</th>
                {isSprint && (
                  <>
                    <th className="text-center py-2 px-1 w-16">Sprint</th>
                    <th className="text-center py-2 px-1 w-12">DNF</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => {
                const row = resultForm.get(driver.id);
                if (!row) return null;

                const racePosDuplicate =
                  row.finish_position_race != null &&
                  validation.raceDuplicates.has(row.finish_position_race);
                const racePosOutOfRange =
                  row.finish_position_race != null &&
                  validation.raceOutOfRange.has(row.finish_position_race);
                const raceHasError = racePosDuplicate || racePosOutOfRange;

                const sprintPosDuplicate =
                  row.finish_position_sprint != null &&
                  validation.sprintDuplicates.has(row.finish_position_sprint);
                const sprintPosOutOfRange =
                  row.finish_position_sprint != null &&
                  validation.sprintOutOfRange.has(row.finish_position_sprint);
                const sprintHasError = sprintPosDuplicate || sprintPosOutOfRange;

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
                        max={validation.raceMaxPos}
                        placeholder={row.is_dnf_race ? "DNF" : "—"}
                        disabled={row.is_dnf_race}
                        value={row.finish_position_race ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateField(
                            driver.id,
                            "finish_position_race",
                            val === "" ? null : parseInt(val, 10)
                          );
                        }}
                        className={`w-16 h-8 text-center text-sm px-1 ${
                          raceHasError
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        } ${row.is_dnf_race ? "opacity-40 cursor-not-allowed" : ""}`}
                      />
                    </td>
                    <td className="py-1.5 px-1 text-center">
                      <Checkbox
                        checked={row.is_dnf_race}
                        onCheckedChange={(checked) => {
                          const isDnf = !!checked;
                          setResultForm((prev) => {
                            const next = new Map(prev);
                            const existing = next.get(driver.id);
                            if (existing) {
                              next.set(driver.id, {
                                ...existing,
                                is_dnf_race: isDnf,
                                // Clear position when DNF is checked
                                finish_position_race: isDnf
                                  ? null
                                  : existing.finish_position_race,
                              });
                            }
                            return next;
                          });
                        }}
                      />
                    </td>
                    {isSprint && (
                      <>
                        <td className="py-1.5 px-1">
                          <Input
                            type="number"
                            min={1}
                            max={validation.sprintMaxPos}
                            placeholder={row.is_dnf_sprint ? "DNF" : "—"}
                            disabled={row.is_dnf_sprint}
                            value={row.finish_position_sprint ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateField(
                                driver.id,
                                "finish_position_sprint",
                                val === "" ? null : parseInt(val, 10)
                              );
                            }}
                            className={`w-16 h-8 text-center text-sm px-1 ${
                              sprintHasError
                                ? "border-red-500 focus-visible:ring-red-500"
                                : ""
                            } ${row.is_dnf_sprint ? "opacity-40 cursor-not-allowed" : ""}`}
                          />
                        </td>
                        <td className="py-1.5 px-1 text-center">
                          <Checkbox
                            checked={row.is_dnf_sprint}
                            onCheckedChange={(checked) => {
                              const isDnf = !!checked;
                              setResultForm((prev) => {
                                const next = new Map(prev);
                                const existing = next.get(driver.id);
                                if (existing) {
                                  next.set(driver.id, {
                                    ...existing,
                                    is_dnf_sprint: isDnf,
                                    // Clear position when DNF is checked
                                    finish_position_sprint: isDnf
                                      ? null
                                      : existing.finish_position_sprint,
                                  });
                                }
                                return next;
                              });
                            }}
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
        <Button onClick={handleSave} disabled={saving || !validation.isValid}>
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
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2">Player</th>
                    <th className="text-left py-2">Driver</th>
                    <th className="text-left py-2">Team</th>
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
                      <td className="py-1.5 text-muted-foreground">
                        {a.driver_team}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
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
  const [statusMsg, setStatusMsg] = useState<Message | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scores & Status</CardTitle>
        <CardDescription>
          Calculate scores and manage race status for R{race.round_number}:{" "}
          {race.race_name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Calculation */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Score Calculation</h3>

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
        </div>

        <div className="border-t" />

        {/* Race Status */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Race Status</h3>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Current status:</span>
            <Badge
              variant={
                race.status === "completed"
                  ? "default"
                  : race.status === "active"
                    ? "secondary"
                    : "outline"
              }
            >
              {race.status}
            </Badge>
          </div>

          {race.status === "active" && (
            <div className="flex items-center gap-3">
              {!confirmComplete ? (
                <Button
                  size="sm"
                  disabled={updatingStatus || resultCount === 0}
                  onClick={() => setConfirmComplete(true)}
                >
                  Mark as Completed
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-yellow-400">
                    This will also activate the next race.
                  </span>
                  <Button
                    size="sm"
                    disabled={updatingStatus}
                    onClick={async () => {
                      setUpdatingStatus(true);
                      setStatusMsg(null);
                      const res = await admin.updateRaceStatus(
                        race.id,
                        "completed"
                      );
                      setStatusMsg({
                        type: res.success ? "success" : "error",
                        text: res.message,
                      });
                      setConfirmComplete(false);
                      setUpdatingStatus(false);
                    }}
                  >
                    {updatingStatus ? "Updating…" : "Yes, complete"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmComplete(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}

          {race.status === "completed" && (
            <Button
              size="sm"
              variant="outline"
              disabled={updatingStatus}
              onClick={async () => {
                setUpdatingStatus(true);
                setStatusMsg(null);
                const res = await admin.updateRaceStatus(race.id, "active");
                setStatusMsg({
                  type: res.success ? "success" : "error",
                  text: res.message,
                });
                setUpdatingStatus(false);
              }}
            >
              {updatingStatus ? "Updating…" : "Revert to Active"}
            </Button>
          )}

          {statusMsg && <Alert message={statusMsg} />}
        </div>
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
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading admin panel…</p>
        </div>
      </div>
    );
  }

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

  // Group races by status for the selector
  const activeRaces = races.filter((r) => r.status === "active");
  const upcomingRaces = races.filter((r) => r.status === "upcoming");
  const completedRaces = races.filter((r) => r.status === "completed");

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      {/* ---- Competition-wide section ---- */}
      <CompetitionStatusCard
        members={members}
        assignmentCount={assignmentCount}
        acceptingMembers={admin.acceptingMembers}
        onToggleAccepting={(value) => admin.toggleAcceptingMembers(value)}
      />

      <AssignmentsCard
        assignmentCount={assignmentCount}
        memberCount={members.length}
        raceAssignments={raceAssignments}
        raceLoading={raceLoading}
        selectedRace={selectedRace}
        admin={admin}
      />

      {/* ---- Race-specific section ---- */}
      <div className="border-t pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="text-lg font-semibold shrink-0">Race Management</h2>
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

        {selectedRace ? (
          <>
            <RaceManagementCard
              race={selectedRace}
              competitionId={competitionId!}
              resultCount={raceResults.length}
              admin={admin}
            />

            <ResultsEntryCard
              race={selectedRace}
              drivers={drivers}
              existingResults={raceResults}
              admin={admin}
            />

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
                Select a race to manage lock timers, results, and scores.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
