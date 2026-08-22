import assert from "node:assert/strict";
import test from "node:test";

import { normalizeIntake } from "./normalize.js";

test("normalizes an explicit intake timestamp", () => {
  const result = normalizeIntake({
    intakeDate: "2026-08-22T08:35:00-07:00",
  });

  assert.deepEqual(result.normalizedRecord, {
    intakeDate: "2026-08-22T15:35:00.000Z",
  });
  assert.deepEqual(
    result.changes.map(({ field, ruleId }) => ({ field, ruleId })),
    [
      { field: "intakeDate", ruleId: "date.rfc3339-to-utc" },
    ],
  );
  assert.equal(result.needsReview, false);
});

test("routes ambiguous intake dates to review instead of guessing", () => {
  const result = normalizeIntake({
    intakeDate: "08/22/26",
  });

  assert.deepEqual(result.normalizedRecord, {});
  assert.deepEqual(
    result.warnings.map(({ field, code }) => ({ field, code })),
    [
      { field: "intakeDate", code: "invalid_date" },
    ],
  );
  assert.equal(result.needsReview, true);
});

test("rejects invalid calendar dates", () => {
  const result = normalizeIntake({
    intakeDate: "2026-02-30",
  });

  assert.deepEqual(
    result.warnings.map(({ field, code }) => ({ field, code })),
    [
      { field: "intakeDate", code: "invalid_date" },
    ],
  );
});
