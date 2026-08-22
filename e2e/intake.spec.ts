import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/intake");
  await expect(page.locator("#example option")).toHaveCount(4);
});

test("keeps desktop dividers on the actual left-column panels", async ({
  page,
}) => {
  const normalizedPanel = page.locator("#record").locator("..");
  const changesPanel = page.locator("#changes").locator("..");
  const warningsPanel = page.locator("#warnings").locator("..");

  await expect(normalizedPanel).toHaveCSS("border-right-width", "1px");
  await expect(changesPanel).toHaveCSS("border-right-width", "0px");
  await expect(warningsPanel).toHaveCSS("border-right-width", "1px");
});

test("renders successful and review-required normalization states", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Normalize intake" }).click();
  await expect(page.getByRole("status")).toHaveText("Normalization complete");
  await expect(page.locator("#record")).toContainText("species");
  await expect(page.locator("#record")).toContainText("dog");
  await expect(page.locator("#warnings")).toContainText(
    "No human review warnings.",
  );
  const normalizedSpecies = page.locator(
    '#comparison tr[data-field="species"]',
  );
  await expect(normalizedSpecies.locator('[data-column="intake"]')).toHaveText(
    '" Canine "',
  );
  await expect(
    normalizedSpecies.locator('[data-column="normalized"]'),
  ).toHaveText('"dog"');
  await expect(normalizedSpecies.locator('[data-column="outcome"]')).toHaveText(
    "Changed",
  );

  await page.locator("#example").selectOption("ambiguous");
  await page.getByRole("button", { name: "Normalize intake" }).click();
  await expect(page.getByRole("status")).toHaveText("Human review required");
  await expect(page.locator("#warnings")).toContainText(
    "Species is not in the supported vocabulary.",
  );
  const reviewSpecies = page.locator('#comparison tr[data-field="species"]');
  await expect(reviewSpecies.locator('[data-column="intake"]')).toHaveText(
    '"doggo"',
  );
  await expect(
    reviewSpecies.locator('[data-column="normalized"]'),
  ).toHaveText("—");
  await expect(reviewSpecies.locator('[data-column="outcome"]')).toHaveText(
    "Review required",
  );
});

test("discards an in-flight result when source JSON changes", async ({
  page,
}) => {
  let releaseRequest: (() => void) | undefined;
  const requestHeld = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  await page.route("**/api/intake/normalize", async (route) => {
    await requestHeld;
    await route.continue().catch(() => undefined);
  });

  await page.getByRole("button", { name: "Normalize intake" }).click();
  await expect(page.getByRole("status")).toHaveText("Normalizing…");
  await page.locator("#source").fill('{"animalId":"CHANGED"}');
  await expect(page.getByRole("status")).toHaveText(
    "Source changed — run normalization again.",
  );
  releaseRequest?.();

  await expect(page.locator("#record-empty")).toHaveText(
    "Result cleared because the source changed.",
  );
  await expect(page.locator("#comparison-empty")).toHaveText(
    "Run normalization to compare fields.",
  );
  await expect(page.locator("#record")).not.toContainText("SF-2026-0042");
});

test("classifies unchanged, missing, error, and not-normalized outcomes", async ({
  page,
}) => {
  await page.route("**/api/intake/normalize", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        ok: true,
        result: {
          schemaVersion: "0.1.0",
          provenance: {
            rulesetVersion: "0.2.0",
            profile: null,
          },
          normalizedRecord: {
            sex: "male",
          },
          changes: [
            {
              field: "animalId",
              to: "ERROR-WINS",
              ruleId: "test.change",
            },
          ],
          warnings: [],
          errors: [
            {
              field: "animalId",
              code: "test_error",
              message: "Synthetic validation error.",
            },
          ],
          needsReview: true,
        },
      },
    });
  });
  await page.locator("#source").fill(
    JSON.stringify({
      animalId: "SOURCE-ID",
      intakeReasonText: "Unclassified reason",
      sex: "male",
    }),
  );
  await page.getByRole("button", { name: "Normalize intake" }).click();

  await expect(
    page.locator('#comparison tr[data-field="animalId"] [data-column="outcome"]'),
  ).toHaveText("Validation error");
  await expect(
    page.locator('#comparison tr[data-field="intakeReasonText"] [data-column="outcome"]'),
  ).toHaveText("Not normalized");
  await expect(
    page.locator('#comparison tr[data-field="sex"] [data-column="outcome"]'),
  ).toHaveText("Unchanged");
  await expect(
    page.locator('#comparison tr[data-field="species"] [data-column="outcome"]'),
  ).toHaveText("Missing");
});

test("times out stalled normalization and recovers the action", async ({
  page,
}) => {
  await page.clock.install();
  await page.route("**/api/intake/normalize", async () => {
    await new Promise(() => undefined);
  });

  await page.getByRole("button", { name: "Normalize intake" }).click();
  await expect(page.getByRole("status")).toHaveText("Normalizing…");
  await page.clock.fastForward(10_001);

  await expect(page.getByRole("alert")).toHaveText(
    "Normalization timed out. Try again.",
  );
  await expect(
    page.getByRole("button", { name: "Normalize intake" }),
  ).toBeEnabled();
});

test("renders source-controlled values as text rather than markup", async ({
  page,
}) => {
  await page.locator("#source").fill(
    JSON.stringify({
      animalId: "XSS-TEST",
      intakeReasonText: '<img src=x onerror="window.__xss = true">',
    }),
  );
  await page.getByRole("button", { name: "Normalize intake" }).click();

  await expect(page.getByRole("status")).toHaveText("Normalization complete");
  await expect(page.locator("#record")).toContainText("<img src=x");
  await expect(page.locator("#record img")).toHaveCount(0);
  const comparison = page.locator(
    '#comparison tr[data-field="intakeReasonText"]',
  );
  await expect(comparison.locator('[data-column="intake"]')).toContainText(
    "<img src=x",
  );
  await expect(comparison.locator('[data-column="normalized"]')).toContainText(
    "<img src=x",
  );
  await expect(comparison.locator("img")).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.get(window, "__xss"))).toBeUndefined();
});
