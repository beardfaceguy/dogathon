import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeIntake,
  type NormalizationProfile,
} from "./normalize.js";

const profile: NormalizationProfile = {
  id: "synthetic-rescue",
  revision: "2026-08-22",
  aliases: {
    species: {
      "canine mix": "dog",
    },
    intakeType: {
      "owner dropoff": "relinquished_by_owner",
    },
  },
  requiredFields: ["animalId", "species", "intakeType"],
};

test("organization profiles add explicit aliases with audit provenance", () => {
  const result = normalizeIntake(
    {
      animalId: "TEST-PROFILE-001",
      species: "Canine Mix",
      intakeType: "Owner Dropoff",
    },
    profile,
  );

  assert.deepEqual(result.normalizedRecord, {
    species: "dog",
    intakeType: "relinquished_by_owner",
    animalId: "TEST-PROFILE-001",
  });
  assert.deepEqual(
    result.changes.map(({ field, ruleId }) => ({ field, ruleId })),
    [
      {
        field: "species",
        ruleId: "profile.synthetic-rescue.species.canine-mix",
      },
      {
        field: "intakeType",
        ruleId: "profile.synthetic-rescue.intake-type.owner-dropoff",
      },
    ],
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.provenance.profile?.id, "synthetic-rescue");
  assert.equal(result.provenance.profile?.revision, "2026-08-22");
  assert.match(
    result.provenance.profile?.digest ?? "",
    /^sha256:[a-f0-9]{64}$/,
  );
  assert.equal(result.needsReview, false);
});

test("organization profiles report missing required canonical fields", () => {
  const result = normalizeIntake(
    {
      animalId: "  ",
      species: "doggo",
    },
    profile,
  );

  assert.deepEqual(result.errors, [
    {
      field: "animalId",
      code: "required",
      message: "Animal ID is required by profile synthetic-rescue.",
    },
    {
      field: "species",
      code: "required",
      message: "Species is required by profile synthetic-rescue.",
    },
    {
      field: "intakeType",
      code: "required",
      message: "Intake type is required by profile synthetic-rescue.",
    },
  ]);
  assert.equal(result.needsReview, true);
});

test("profile aliases cannot override the global controlled vocabulary", () => {
  const conflictingProfile: NormalizationProfile = {
    id: "conflicting-rescue",
    revision: "2026-08-22",
    aliases: {
      species: {
        dog: "cat",
      },
    },
  };

  const result = normalizeIntake({ species: "dog" }, conflictingProfile);

  assert.equal(result.normalizedRecord.species, "dog");
  assert.deepEqual(result.changes, []);
});

test("profiles require non-empty trimmed identity and revision", () => {
  assert.throws(
    () => normalizeIntake({}, { id: "", revision: "1" }),
    /profile id must be a non-empty, trimmed string/,
  );
  assert.throws(
    () => normalizeIntake({}, { id: "rescue", revision: " " }),
    /profile revision must be a non-empty, trimmed string/,
  );
});

test("profile digest changes with normalization-affecting content", () => {
  const first = normalizeIntake({}, {
    id: "rescue",
    revision: "1",
  });
  const second = normalizeIntake({}, {
    id: "rescue",
    revision: "1",
    requiredFields: ["species"],
  });

  assert.notEqual(
    first.provenance.profile?.digest,
    second.provenance.profile?.digest,
  );
});
