import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.use({
  storageState: path.join(__dirname, ".auth", "main-user.json"),
});

test.describe("History Page - Race Results", () => {
  test("loads history page with completed races", async ({ page }) => {
    await page.goto("/history");

    await expect(page.getByRole("heading", { name: "History" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Browse race results")).toBeVisible();

    // "By Race" tab should be active by default
    const byRaceBtn = page.getByRole("button", { name: "By Race" });
    await expect(byRaceBtn).toBeVisible();
  });

  test("displays results table for a completed race", async ({ page }) => {
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible({
      timeout: 10_000,
    });

    // A race should be auto-selected (most recent completed)
    // Wait for the table to appear
    await expect(page.locator("table").first()).toBeVisible({ timeout: 10_000 });

    // Table headers should be visible
    await expect(page.getByRole("columnheader", { name: "Player" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Pred" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Actual" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Pts" })).toBeVisible();
  });

  test("shows test user in results with 'You' badge", async ({ page }) => {
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible({
      timeout: 10_000,
    });

    // Wait for the table data to load
    await expect(page.locator("table").first()).toBeVisible({ timeout: 10_000 });

    // The test user should appear in the table
    await expect(page.getByText("E2E Tester").first()).toBeVisible({
      timeout: 5_000,
    });

    // "You" badge should be visible next to test user's row
    await expect(page.getByText("You").first()).toBeVisible();
  });

  test("can switch to 'By Player' tab and view history", async ({ page }) => {
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible({
      timeout: 10_000,
    });

    // Click "By Player" tab
    await page.getByRole("button", { name: "By Player" }).click();

    // Wait for the player history table to load
    await expect(page.locator("table").first()).toBeVisible({ timeout: 10_000 });

    // Table should show race rows (R1, R2, etc.)
    await expect(page.getByText(/R1/).first()).toBeVisible({ timeout: 5_000 });

    // Should show Total row at the bottom
    await expect(page.getByText("Total")).toBeVisible();
  });

  test("By Player tab shows sprint sub-rows for sprint weekends", async ({
    page,
  }) => {
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible({
      timeout: 10_000,
    });

    // Switch to By Player tab
    await page.getByRole("button", { name: "By Player" }).click();

    // Wait for table to load
    await expect(page.locator("table").first()).toBeVisible({ timeout: 10_000 });

    // R2 China is a sprint weekend — should show "Sprint" sub-row
    await expect(page.getByText("Sprint").first()).toBeVisible({
      timeout: 5_000,
    });
  });
});
