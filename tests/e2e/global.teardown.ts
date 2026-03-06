import { test as teardown } from "@playwright/test";
import { deleteTestUser } from "./helpers/supabase-admin";
import { cleanupUser } from "./helpers/seed";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, ".auth");
const TEST_DATA_PATH = path.join(AUTH_DIR, "test-data.json");

teardown("clean up test users and data", async () => {
  if (!fs.existsSync(TEST_DATA_PATH)) {
    console.log("[teardown] no test-data.json found, skipping");
    return;
  }

  const { authUserId, mainUserId } = JSON.parse(
    fs.readFileSync(TEST_DATA_PATH, "utf-8")
  );

  // Clean up seeded data (scores, predictions, assignments, membership)
  console.log("[teardown] cleaning up main user data...");
  await cleanupUser(mainUserId);

  console.log("[teardown] cleaning up auth user data...");
  await cleanupUser(authUserId); // may have joined competition during tests

  // Delete auth users (profiles cascade-delete)
  console.log("[teardown] deleting auth users...");
  await deleteTestUser(mainUserId);
  await deleteTestUser(authUserId);

  // Remove temp files
  for (const file of ["auth-user.json", "main-user.json", "test-data.json"]) {
    const filePath = path.join(AUTH_DIR, file);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  console.log("[teardown] complete");
});
