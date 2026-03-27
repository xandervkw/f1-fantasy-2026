import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function FeedbackPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [cooldownLabel, setCooldownLabel] = useState("");

  const checkCooldown = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("feedback")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastSubmit = new Date(data[0].created_at);
      const unlockAt = new Date(lastSubmit.getTime() + 60 * 60 * 1000);
      if (unlockAt > new Date()) {
        setCooldownUntil(unlockAt);
      } else {
        setCooldownUntil(null);
      }
    }
  }, [user]);

  useEffect(() => {
    checkCooldown();
  }, [checkCooldown]);

  // Update countdown label every second while on cooldown
  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownLabel("");
      return;
    }

    function update() {
      const diff = cooldownUntil!.getTime() - Date.now();
      if (diff <= 0) {
        setCooldownUntil(null);
        setCooldownLabel("");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCooldownLabel(`${mins}m ${secs}s`);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || !user) return;

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("feedback")
      .insert({ user_id: user.id, message: message.trim() });

    setSubmitting(false);

    if (insertError) {
      if (insertError.message.includes("Rate limit")) {
        await checkCooldown();
        setError("You've already submitted feedback recently. Please wait before submitting again.");
      } else {
        setError(insertError.message);
      }
    } else {
      setSubmitted(true);
      setMessage("");
      setCooldownUntil(new Date(Date.now() + 60 * 60 * 1000));
    }
  }

  const onCooldown = cooldownUntil !== null;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Feedback</h1>
        <p className="text-muted-foreground">
          Got an idea, found a bug, or want something changed? Let us know!
          You can include as much as you want in a single submission.
          After submitting, there's a 1-hour cooldown before you can submit again.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit Feedback</CardTitle>
          <CardDescription>
            Your feedback helps us improve the game.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-2">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                Thanks for your feedback!
              </p>
              {onCooldown && (
                <p className="text-sm text-muted-foreground">
                  You can submit again in {cooldownLabel}.
                </p>
              )}
            </div>
          ) : onCooldown ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                You've already submitted feedback recently.
                You can submit again in <span className="font-medium text-foreground">{cooldownLabel}</span>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind? Include everything you want to share — ideas, bugs, suggestions..."
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
              />
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
              <Button
                type="submit"
                disabled={!message.trim() || submitting}
              >
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
