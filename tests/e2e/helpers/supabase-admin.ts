import { createClient, type Session } from "@supabase/supabase-js";
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
} from "./constants";

/** Admin client — bypasses all RLS policies */
export const adminClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** Anon client — used for verifyOtp (needs non-admin client) */
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Create a test auth user and obtain a valid Supabase session.
 *
 * 1. admin.createUser() with email_confirm: true
 * 2. Poll profiles table until trigger fires
 * 3. admin.generateLink() to get a magic link token
 * 4. verifyOtp() to exchange token for a real session
 */
export async function createTestUser(
  email: string,
  displayName: string
): Promise<{ userId: string; session: Session }> {
  // Step 1: Create the auth user
  const { data: createData, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: displayName },
    });

  if (createError || !createData.user) {
    throw new Error(
      `Failed to create test user: ${createError?.message ?? "no user returned"}`
    );
  }

  const userId = createData.user.id;

  // Step 2: Wait for the profile trigger to fire
  let profileReady = false;
  for (let i = 0; i < 15; i++) {
    const { data } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (data) {
      profileReady = true;
      break;
    }
    await sleep(200);
  }

  if (!profileReady) {
    throw new Error("Profile trigger did not fire within 3 seconds");
  }

  // Step 3: Generate a magic link to get a token
  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

  if (linkError || !linkData.properties?.hashed_token) {
    throw new Error(
      `Failed to generate magic link: ${linkError?.message ?? "no token"}`
    );
  }

  // Step 4: Exchange the token for a session
  const { data: otpData, error: otpError } = await anonClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (otpError || !otpData.session) {
    throw new Error(
      `Failed to verify OTP: ${otpError?.message ?? "no session returned"}`
    );
  }

  return { userId, session: otpData.session };
}

/** Delete a test auth user. Profile cascade-deletes via FK. */
export async function deleteTestUser(userId: string): Promise<void> {
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    console.error(`Warning: failed to delete test user ${userId}:`, error.message);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
