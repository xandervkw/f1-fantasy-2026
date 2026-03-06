import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// This spec uses the auth user who has NO competition membership
test.use({
  storageState: path.join(__dirname, ".auth", "auth-user.json"),
});

test.describe("Auth & Join Competition", () => {
  test("redirects unauthenticated user to landing page", async ({ browser }) => {
    // Create a fresh context with NO storage state
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    await page.goto("/dashboard");

    // Should redirect to landing page (may include ?redirect= query param)
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/(\?.*)?$/, { timeout: 10_000 });
    await expect(page.getByText("Sign in with Google")).toBeVisible();

    await context.close();
  });

  test("redirects authenticated user without competition to /join", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // ProtectedRoute should redirect to /join
    await expect(page).toHaveURL("/join", { timeout: 10_000 });
    await expect(page.getByText("Join a Competition")).toBeVisible();
  });

  test("shows profile name on join page", async ({ page }) => {
    await page.goto("/join");

    await expect(page.getByText(/Welcome.*E2E Auth Tester/)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("rejects invalid invite code", async ({ page }) => {
    await page.goto("/join");
    await expect(page.getByText("Join a Competition")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByPlaceholder("Enter invite code").fill("INVALID");
    await page.getByRole("button", { name: "Join Competition" }).click();

    await expect(page.getByText(/Invalid invite code/)).toBeVisible({
      timeout: 5_000,
    });
  });

  test("joins competition with valid invite code", async ({ page }) => {
    await page.goto("/join");
    await expect(page.getByText("Join a Competition")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByPlaceholder("Enter invite code").fill("X7KM9Q");
    await page.getByRole("button", { name: "Join Competition" }).click();

    // Should redirect to /dashboard after successful join
    await expect(page).toHaveURL("/dashboard", { timeout: 10_000 });
  });

  test("profile name displayed in navbar after join", async ({ page }) => {
    // After the previous test joined, this user now has a competition membership.
    // But we need to reload with the updated auth state for the redirect to work.
    await page.goto("/dashboard");

    // May redirect to /join if membership isn't recognized yet, wait for nav
    await page.waitForURL(/\/(dashboard|join)/, { timeout: 10_000 });

    // The navbar should show the display name
    await expect(page.getByRole("navigation").getByText("E2E Auth Tester")).toBeVisible({
      timeout: 10_000,
    });
  });
});
