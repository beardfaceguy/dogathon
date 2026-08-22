import { expect, test } from "@playwright/test";

test("retries transient Render routing failures while loading examples", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/api/intake/examples", async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({ status: 404, body: "Not Found" });
    } else {
      await route.continue();
    }
  });

  await page.goto("/intake");
  await expect(page.locator("#example option")).toHaveCount(4);
  expect(attempts).toBe(2);
});

test("retries transient Render routing failures while normalizing", async ({
  page,
}) => {
  await page.goto("/intake");
  await expect(page.locator("#example option")).toHaveCount(4);

  let attempts = 0;
  await page.route("**/api/intake/normalize", async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({ status: 503, body: "Unavailable" });
    } else {
      await route.continue();
    }
  });

  await page.getByRole("button", { name: "Normalize intake" }).click();
  await expect(page.getByRole("status")).toHaveText("Normalization complete");
  expect(attempts).toBe(2);
});
