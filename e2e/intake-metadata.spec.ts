import { expect, test } from "@playwright/test";

test("normalization stays disabled until comparison metadata loads", async ({
  page,
}) => {
  let releaseMetadata: (() => void) | undefined;
  const metadataHeld = new Promise<void>((resolve) => {
    releaseMetadata = resolve;
  });
  await page.route("**/api/intake/examples", async (route) => {
    await metadataHeld;
    await route.continue();
  });

  await page.goto("/intake");
  const normalize = page.getByRole("button", { name: "Normalize intake" });
  await expect(normalize).toBeDisabled();
  await page.locator("#source").fill('{"species":"canine"}');
  await expect(normalize).toBeDisabled();

  releaseMetadata?.();
  await expect(page.locator("#example option")).toHaveCount(4);
  await expect(normalize).toBeEnabled();
});

test("normalization remains disabled when comparison metadata fails", async ({
  page,
}) => {
  await page.route("**/api/intake/examples", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "synthetic failure" }),
    });
  });

  await page.goto("/intake");
  await expect(page.getByRole("alert")).toHaveText("Could not load examples.");
  await expect(
    page.getByRole("button", { name: "Normalize intake" }),
  ).toBeDisabled();
});
