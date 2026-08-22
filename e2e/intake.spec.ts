import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/intake");
  await expect(page.locator("#example option")).toHaveCount(4);
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

  await page.locator("#example").selectOption("ambiguous");
  await page.getByRole("button", { name: "Normalize intake" }).click();
  await expect(page.getByRole("status")).toHaveText("Human review required");
  await expect(page.locator("#warnings")).toContainText(
    "Species is not in the supported vocabulary.",
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
  await expect(page.locator("#record")).not.toContainText("SF-2026-0042");
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
  expect(await page.evaluate(() => Reflect.get(window, "__xss"))).toBeUndefined();
});
