import { test as setup } from "@playwright/test";
import { createTestUser } from "./helpers/supabase-admin";
import { seedMainUser } from "./helpers/seed";
import { STORAGE_KEY } from "./helpers/constants";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, ".auth");
const AUTH_USER_PATH = path.join(AUTH_DIR, "auth-user.json");
const MAIN_USER_PATH = path.join(AUTH_DIR, "main-user.json");
const TEST_DATA_PATH = path.join(AUTH_DIR, "test-data.json");

function buildStorageState(session: object) {
  return {
    cookies: [],
    origins: [
      {
        origin: "http://localhost:5173",
        localStorage: [
          { name: STORAGE_KEY, value: JSON.stringify(session) },
        ],
      },
    ],
  };
}

setup("create test users and seed data", async () => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const timestamp = Date.now();

  // 1. Create auth test user (no competition membership — for join flow)
  const authUser = await createTestUser(
    `e2e-auth-${timestamp}@test.local`,
    "E2E Auth Tester"
  );
  console.log(`[setup] auth user created: ${authUser.userId}`);

  // 2. Create main test user (with full seeded data)
  const mainUser = await createTestUser(
    `e2e-main-${timestamp}@test.local`,
    "E2E Tester"
  );
  console.log(`[setup] main user created: ${mainUser.userId}`);

  // 3. Seed data for main user
  const seedData = await seedMainUser(mainUser.userId);
  console.log(
    `[setup] seeded: ${seedData.raceIds.length} race assignments, driver ${seedData.driverIdForR6}`
  );

  // 4. Save storage states (for browser localStorage injection)
  fs.writeFileSync(
    AUTH_USER_PATH,
    JSON.stringify(buildStorageState(authUser.session))
  );
  fs.writeFileSync(
    MAIN_USER_PATH,
    JSON.stringify(buildStorageState(mainUser.session))
  );

  // 5. Save test data for teardown
  fs.writeFileSync(
    TEST_DATA_PATH,
    JSON.stringify({
      authUserId: authUser.userId,
      mainUserId: mainUser.userId,
    })
  );

  console.log("[setup] complete");
});
