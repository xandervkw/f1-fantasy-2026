import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// This spec uses the main user who has competition membership + seeded data
test.use({
  storageState: path.join(__dirname, ".auth", "main-user.json"),
});

test.describe("Dashboard - Driver & Prediction", () => {
  test("shows assigned driver for the active race", async ({ page }) => {
    await page.goto("/dashboard");

    // Wait for dashboard to load (past spinner)
    await expect(page.getByText("Your assigned driver")).toBeVisible({
      timeout: 15_000,
    });

    // Should show Round 6 Miami
    await expect(page.getByText(/Round 6/)).toBeVisible();
    await expect(page.getByText(/Miami/).first()).toBeVisible();

    // R6 is a sprint weekend
    await expect(page.getByText("Sprint Weekend")).toBeVisible();

    // Race Weekend badge
    await expect(page.getByText("Race Weekend")).toBeVisible();
  });

  test("can submit a race prediction", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Your assigned driver")).toBeVisible({
      timeout: 15_000,
    });

    // Find the Race Prediction section
    const raceHeading = page.getByText("Race Prediction", { exact: true });
    await expect(raceHeading).toBeVisible();

    // The race prediction section has a number input — find it
    // PredictionSection renders: h3 "Race Prediction" → input type="number" → Button
    const raceSection = raceHeading.locator("..").locator("..");
    const raceInput = raceSection.locator('input[type="number"]');
    await raceInput.fill("5");

    // Click Submit
    const submitBtn = raceSection.getByRole("button", { name: /Submit|Update/ });
    await submitBtn.click();

    // Verify success message
    await expect(page.getByText("Race prediction saved!")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("can update an existing prediction", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Your assigned driver")).toBeVisible({
      timeout: 15_000,
    });

    const raceHeading = page.getByText("Race Prediction", { exact: true });
    const raceSection = raceHeading.locator("..").locator("..");
    const raceInput = raceSection.locator('input[type="number"]');

    // Should show current value from previous test
    await expect(raceInput).toHaveValue("5", { timeout: 5_000 });

    // Change to P3
    await raceInput.fill("3");

    const updateBtn = raceSection.getByRole("button", { name: "Update" });
    await updateBtn.click();

    await expect(page.getByText("Race prediction saved!")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("can submit a sprint prediction", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Your assigned driver")).toBeVisible({
      timeout: 15_000,
    });

    // R6 is a sprint weekend — Sprint Prediction section should exist
    const sprintHeading = page.getByText("Sprint Prediction", { exact: true });
    await expect(sprintHeading).toBeVisible();

    const sprintSection = sprintHeading.locator("..").locator("..");
    const sprintInput = sprintSection.locator('input[type="number"]');
    await sprintInput.fill("7");

    const submitBtn = sprintSection.getByRole("button", {
      name: /Submit|Update/,
    });
    await submitBtn.click();

    await expect(page.getByText("Sprint prediction saved!")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("shows last saved timestamp after submission", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Your assigned driver")).toBeVisible({
      timeout: 15_000,
    });

    // After previous tests submitted predictions, "Last saved" should appear
    await expect(page.getByText(/Last saved/).first()).toBeVisible({
      timeout: 5_000,
    });
  });
});
