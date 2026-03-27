import { useState } from "react";
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
      setError(insertError.message);
    } else {
      setSubmitted(true);
      setMessage("");
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Feedback</h1>
        <p className="text-muted-foreground">
          Got an idea, found a bug, or want something changed? Let us know!
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
            <div className="space-y-4">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                Thanks for your feedback!
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSubmitted(false)}
              >
                Submit another
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
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
