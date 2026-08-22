import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  evaluateFixtureDirectory,
  goldenProjection,
} from "./evaluate.js";

test("fixture evaluation reports normalization coverage and review volume", () => {
  const report = evaluateFixtureDirectory(
    join(process.cwd(), "test-data", "intake-records"),
  );

  assert.deepEqual(report.summary, {
    records: 4,
    normalizedFields: 26,
    changedFields: 22,
    warnings: 5,
    errors: 0,
    recordsNeedingReview: 1,
  });
});

test("fixture outputs match their checked-in golden projections", () => {
  const report = evaluateFixtureDirectory(
    join(process.cwd(), "test-data", "intake-records"),
  );

  for (const record of report.records) {
    const expectedPath = join(
      process.cwd(),
      "test-data",
      "expected",
      record.name.replace(/\.json$/, ".normalized.json"),
    );
    const expected = JSON.parse(readFileSync(expectedPath, "utf8"));
    assert.deepEqual(goldenProjection(record.result), expected, record.name);
  }
});
