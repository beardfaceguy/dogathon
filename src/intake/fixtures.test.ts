import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { normalizeIntake, type IntakeDraft } from "./normalize.js";

function fixture(name: string): IntakeDraft {
  const path = join(process.cwd(), "test-data", "intake-records", name);
  return JSON.parse(readFileSync(path, "utf8")) as IntakeDraft;
}

test("normalizes the synthetic municipal stray intake", () => {
  const result = normalizeIntake(fixture("stray-intake.json"));

  assert.deepEqual(result.normalizedRecord, {
    species: "dog",
    intakeType: "stray",
    ageGroup: "adult",
    sex: "male",
    alteredStatus: "unaltered",
    animalId: "SF-2026-0042",
    intakeReasonText: "Found at large",
    intakeDate: "2026-08-22T15:35:00.000Z",
  });
  assert.equal(result.needsReview, false);
});

test("normalizes the synthetic owner-surrender intake", () => {
  const result = normalizeIntake(fixture("owner-surrender-intake.json"));

  assert.equal(result.normalizedRecord.intakeType, "relinquished_by_owner");
  assert.equal(result.normalizedRecord.alteredStatus, "altered");
  assert.equal(result.normalizedRecord.intakeDate, "2026-08-22");
  assert.equal("weight" in result.normalizedRecord, false);
  assert.equal("notes" in result.normalizedRecord, false);
  assert.equal(result.needsReview, false);
});

test("normalizes the synthetic emergency intake", () => {
  const result = normalizeIntake(fixture("emergency-intake.json"));

  assert.equal(result.normalizedRecord.intakeType, "transfer_in");
  assert.equal(result.normalizedRecord.ageGroup, "juvenile");
  assert.equal(result.normalizedRecord.alteredStatus, "unknown");
  assert.equal(result.normalizedRecord.intakeDate, "2026-08-22T17:15:00.000Z");
  assert.equal(result.needsReview, false);
});

test("routes the ambiguous synthetic intake to review", () => {
  const result = normalizeIntake(fixture("malformed-ambiguous-intake.json"));

  assert.deepEqual(
    result.warnings.map(({ field }) => field),
    ["species", "intakeType", "ageGroup", "sex", "alteredStatus"],
  );
  assert.equal(result.normalizedRecord.animalId, "TEST-AMBIGUOUS-001");
  assert.equal(
    result.normalizedRecord.intakeReasonText,
    "family circumstances / maybe stray?",
  );
  assert.equal("notes" in result.normalizedRecord, false);
  assert.equal(result.needsReview, true);
});
