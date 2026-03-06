import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

// ---------- data ----------

const RACE_SCORING = [
  { off: "0 (perfect)", pts: 10 },
  { off: "1", pts: 7 },
  { off: "2", pts: 5 },
  { off: "3", pts: 3 },
  { off: "4", pts: 2 },
  { off: "5", pts: 1 },
  { off: "6+", pts: 0 },
];

const SPRINT_SCORING = [
  { off: "0 (perfect)", pts: 5 },
  { off: "1", pts: 4 },
  { off: "2", pts: 3 },
  { off: "3", pts: 2 },
  { off: "4", pts: 1 },
  { off: "5+", pts: 0 },
];

const SPRINT_ROUNDS = [2, 6, 7, 11, 14, 18];

// ---------- sub-components ----------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="text-sm text-muted-foreground space-y-2">{children}</div>
    </div>
  );
}

function ScoringTable({
  label,
  rows,
}: {
  label: string;
  rows: { off: string; pts: number }[];
}) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-medium text-foreground">{label}</h3>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left py-2 px-3 font-medium">Positions off</th>
              <th className="text-right py-2 px-3 font-medium">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.off} className="border-b last:border-0">
                <td className="py-1.5 px-3">{r.off}</td>
                <td className="py-1.5 px-3 text-right tabular-nums font-medium">
                  {r.pts}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- page ----------

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">How It Works</h1>
        <p className="text-muted-foreground">
          Everything you need to know about F1 Fantasy 2026
        </p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>The Game</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Section title="Overview">
            <p>
              Each race weekend, every player is assigned a random driver. Your
              job is to predict where that driver will finish. The closer your
              prediction, the more points you earn. After 24 races, the player
              with the most points wins.
            </p>
          </Section>

          <Section title="Driver Assignments">
            <p>
              Drivers are assigned using a balanced rotation system. Over the
              first 22 races, you will be assigned each of the 22 drivers
              exactly once — no repeats and no two players share the same driver
              in any round.
            </p>
            <p>
              Your assigned driver for the next race is revealed after the
              previous race's scores have been calculated. You won't see all
              your future drivers in advance.
            </p>
          </Section>

          <Section title="Making Predictions">
            <p>
              Once you see your assigned driver, enter your predicted finishing
              position (1–22) on the Race tab. You can update your prediction as
              many times as you like before the deadline.
            </p>
            <div className="rounded-md border p-3 space-y-1.5">
              <p className="font-medium text-foreground">Deadlines</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <span className="font-medium text-foreground">
                    Race prediction:
                  </span>{" "}
                  locks 5 minutes before qualifying starts (Saturday)
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Sprint prediction:
                  </span>{" "}
                  locks 5 minutes before the Sprint Shootout starts (separate
                  deadline)
                </li>
              </ul>
              <p>
                After the deadline, your prediction is locked and can't be
                changed. If you miss the deadline, you receive 0 points for that
                race.
              </p>
            </div>
          </Section>
        </CardContent>
      </Card>

      {/* Scoring */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Section title="How Points Work">
            <p>
              Points are based on how close your prediction is to the actual
              finishing position. The closer you are, the more points you earn.
            </p>
          </Section>

          <div className="grid gap-4 sm:grid-cols-2">
            <ScoringTable label="Main Race" rows={RACE_SCORING} />
            <ScoringTable label="Sprint Race" rows={SPRINT_SCORING} />
          </div>

          <Section title="DNF Rule">
            <p>
              If your driver does not finish (DNF), their result is treated as{" "}
              <Badge variant="outline" className="text-xs">
                P22
              </Badge>{" "}
              regardless of how many drivers DNF. Nobody predicts a DNF — you
              just predict a position and accept the risk.
            </p>
          </Section>

          <Section title="Sprint Weekends">
            <p>
              Six rounds include a Sprint race. On sprint weekends, you submit
              two predictions — one for the sprint and one for the main race —
              with separate deadlines and separate points.
            </p>
            <p>
              Sprint rounds:{" "}
              {SPRINT_ROUNDS.map((r, i) => (
                <span key={r}>
                  {i > 0 && ", "}
                  <span className="font-medium text-foreground">R{r}</span>
                </span>
              ))}
            </p>
          </Section>
        </CardContent>
      </Card>

      {/* Standings & Tiebreakers */}
      <Card>
        <CardHeader>
          <CardTitle>Standings & Tiebreakers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Section title="Ranking">
            <p>
              Players are ranked by total points accumulated across all races.
              When two or more players are tied on points, the following
              tiebreakers are applied in order:
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Most perfect predictions (10-point race scores)</li>
              <li>Most 1-off predictions (7-point race scores)</li>
              <li>Best result in the most recent race</li>
            </ol>
          </Section>
        </CardContent>
      </Card>

      {/* Reverse Draft */}
      <Card>
        <CardHeader>
          <CardTitle>Reverse Draft (Races 23 & 24)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Section title="How the Draft Works">
            <p>
              For the final two races, the automatic driver rotation stops.
              Instead, players draft their own driver in reverse standings order
              — the player in last place picks first, and the leader picks last.
            </p>
            <div className="rounded-md border p-3 space-y-1.5">
              <ul className="list-disc list-inside space-y-1">
                <li>
                  After Race 22, players are ranked by total score (ascending —
                  worst first)
                </li>
                <li>
                  Last place picks first for Race 23, up to first place
                </li>
                <li>
                  After Race 23, standings are recalculated and a new draft
                  order is set for Race 24
                </li>
                <li>
                  If you don't pick within 24 hours of your turn, you're
                  auto-assigned the highest-ranked available driver by current
                  F1 championship standing
                </li>
              </ul>
            </div>
          </Section>
        </CardContent>
      </Card>

      {/* Season info */}
      <Card>
        <CardHeader>
          <CardTitle>2026 Season</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Section title="Quick Facts">
            <ul className="list-disc list-inside space-y-1">
              <li>24 races, starting Australia (March 6–8)</li>
              <li>22 drivers across 11 teams (including Cadillac)</li>
              <li>6 sprint weekends</li>
              <li>All times shown in your local timezone</li>
            </ul>
          </Section>
        </CardContent>
      </Card>
    </div>
  );
}
