import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.use({
  storageState: path.join(__dirname, ".auth", "main-user.json"),
});

test.describe("Standings Page", () => {
  test("shows standings page with leaderboard", async ({ page }) => {
    await page.goto("/standings");

    await expect(
      page.getByRole("heading", { name: "Standings" })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Season leaderboard")).toBeVisible();
  });

  test("displays leaderboard table with correct columns", async ({ page }) => {
    await page.goto("/standings");
    await expect(
      page.getByRole("heading", { name: "Standings" })
    ).toBeVisible({ timeout: 10_000 });

    // Wait for table to load
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });

    // Table headers
    await expect(page.getByRole("columnheader", { name: "#" })).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Player" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Pts" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Races" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Perfect" })
    ).toBeVisible();
  });

  test("shows player count and races scored", async ({ page }) => {
    await page.goto("/standings");
    await expect(
      page.getByRole("heading", { name: "Standings" })
    ).toBeVisible({ timeout: 10_000 });

    // CardDescription shows "N players · M races scored"
    await expect(page.getByText(/player/)).toBeVisible();
    await expect(page.getByText(/race.*scored/)).toBeVisible();
  });

  test("highlights current user with 'You' badge", async ({ page }) => {
    await page.goto("/standings");
    await expect(
      page.getByRole("heading", { name: "Standings" })
    ).toBeVisible({ timeout: 10_000 });

    // Wait for table data
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });

    // Test user should appear in the table
    await expect(page.getByRole("table").getByText("E2E Tester").first()).toBeVisible({ timeout: 5_000 });

    // "You" badge next to the current user's row
    await expect(page.getByText("You").first()).toBeVisible();
  });

  test("shows multiple players in the leaderboard", async ({ page }) => {
    await page.goto("/standings");
    await expect(
      page.getByRole("heading", { name: "Standings" })
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });

    // Should have at least 2 rows (test user + existing fake users)
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 5_000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("can navigate to standings from navbar", async ({ page }) => {
    await page.goto("/dashboard");

    // Wait for dashboard to load
    await expect(page.getByText("F1 Fantasy 2026")).toBeVisible({
      timeout: 10_000,
    });

    // Click Standings in the navbar
    await page.getByRole("link", { name: "Standings" }).click();

    await expect(page).toHaveURL("/standings");
    await expect(
      page.getByRole("heading", { name: "Standings" })
    ).toBeVisible({ timeout: 10_000 });
  });
});
