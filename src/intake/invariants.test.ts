import assert from "node:assert/strict";
import test from "node:test";

import { normalizeIntake, type CanonicalIntakeType } from "./normalize.js";

test("normalization is deterministic and does not mutate its input", () => {
  const draft = {
    species: " Canine ",
    intakeType: "owner surrender",
    source: {
      organization: "Synthetic Rescue",
    },
  };
  const before = structuredClone(draft);

  const first = normalizeIntake(draft);
  const second = normalizeIntake(draft);

  assert.deepEqual(first, second);
  assert.deepEqual(draft, before);

  draft.source.organization = "Changed after normalization";
  assert.equal(
    (first.rawRecord.source as { organization: string }).organization,
    "Synthetic Rescue",
  );
});

test("all canonical intake types are idempotent", () => {
  const intakeTypes: CanonicalIntakeType[] = [
    "stray",
    "relinquished_by_owner",
    "seizure_or_confiscate",
    "transfer_in",
    "other",
  ];

  for (const intakeType of intakeTypes) {
    const first = normalizeIntake({ intakeType });
    const second = normalizeIntake(first.normalizedRecord);

    assert.deepEqual(first.normalizedRecord, { intakeType });
    assert.deepEqual(first.warnings, []);
    assert.deepEqual(second.normalizedRecord, first.normalizedRecord);
    assert.deepEqual(second.changes, []);
    assert.deepEqual(second.warnings, []);
  }
});

test("invalid safe-text types are preserved and routed to review", () => {
  const result = normalizeIntake({
    animalId: 42,
    intakeReasonText: {
      text: "nested intake reasons are not a supported text value",
    },
  });

  assert.deepEqual(result.normalizedRecord, {});
  assert.deepEqual(result.warnings, [
    {
      field: "animalId",
      code: "invalid_type",
      message: "Animal ID must be a string.",
      value: 42,
    },
    {
      field: "intakeReasonText",
      code: "invalid_type",
      message: "Intake reason text must be a string.",
      value: {
        text: "nested intake reasons are not a supported text value",
      },
    },
  ]);
  assert.equal(result.needsReview, true);
});
