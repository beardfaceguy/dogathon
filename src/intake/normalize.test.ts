import assert from "node:assert/strict";
import test from "node:test";

import { normalizeIntake } from "./normalize.js";

test("normalizes recognized controlled vocabulary and records each change", () => {
  const draft = {
    species: " Canine ",
    intakeType: " owner surrender ",
  };

  const result = normalizeIntake(draft);

  assert.equal(result.schemaVersion, "0.1.0");
  assert.deepEqual(draft, {
    species: " Canine ",
    intakeType: " owner surrender ",
  });
  assert.deepEqual(result.rawRecord, draft);
  assert.deepEqual(result.normalizedRecord, {
    species: "dog",
    intakeType: "relinquished_by_owner",
  });
  assert.deepEqual(result.changes, [
    {
      field: "species",
      from: " Canine ",
      to: "dog",
      ruleId: "species.alias.canine",
    },
    {
      field: "intakeType",
      from: " owner surrender ",
      to: "relinquished_by_owner",
      ruleId: "intake-type.alias.owner-surrender",
    },
  ]);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.errors, []);
  assert.equal(result.needsReview, false);
});

test("flags unrecognized controlled values for human review", () => {
  const result = normalizeIntake({
    species: "doggo",
    intakeType: "walk-in",
  });

  assert.deepEqual(result.normalizedRecord, {});
  assert.deepEqual(result.warnings, [
    {
      field: "species",
      code: "unrecognized_value",
      message: "Species is not in the supported vocabulary.",
      value: "doggo",
    },
    {
      field: "intakeType",
      code: "unrecognized_value",
      message: "Intake type is not in the supported vocabulary.",
      value: "walk-in",
    },
  ]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.needsReview, true);
});

test("normalizes animal characteristics from common shelter aliases", () => {
  const result = normalizeIntake({
    ageGroup: " Adult ",
    sex: "F",
    alteredStatus: "spayed",
  });

  assert.deepEqual(result.normalizedRecord, {
    ageGroup: "adult",
    sex: "female",
    alteredStatus: "altered",
  });
  assert.deepEqual(
    result.changes.map(({ field, to, ruleId }) => ({ field, to, ruleId })),
    [
      {
        field: "ageGroup",
        to: "adult",
        ruleId: "age-group.canonical.adult",
      },
      {
        field: "sex",
        to: "female",
        ruleId: "sex.alias.f",
      },
      {
        field: "alteredStatus",
        to: "altered",
        ruleId: "altered-status.alias.spayed",
      },
    ],
  );
  assert.equal(result.needsReview, false);
});

test("trims core text fields and leaves narrative extensions raw-only", () => {
  const result = normalizeIntake({
    animalId: "  A-001  ",
    intakeReasonText: "  Housing issue  ",
    notes: "  Prescribed Bravecto®  ",
  });

  assert.deepEqual(result.normalizedRecord, {
    animalId: "A-001",
    intakeReasonText: "Housing issue",
  });
  assert.deepEqual(
    result.changes.map(({ field, to, ruleId }) => ({ field, to, ruleId })),
    [
      { field: "animalId", to: "A-001", ruleId: "text.trim" },
      {
        field: "intakeReasonText",
        to: "Housing issue",
        ruleId: "text.trim",
      },
    ],
  );
  assert.equal(result.rawRecord.notes, "  Prescribed Bravecto®  ");
  assert.equal(result.needsReview, false);
});
