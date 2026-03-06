// Supabase Edge Function: lock-predictions
// Locks predictions when the deadline passes, marks missed predictions.
// Called every minute by pg_cron (via SQL), or manually via HTTP POST.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase.rpc("lock_predictions");

  if (error) {
    console.error("lock_predictions error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("lock_predictions result:", JSON.stringify(data));
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});
