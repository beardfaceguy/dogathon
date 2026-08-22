import assert from "node:assert/strict";
import test from "node:test";

import {
  NORMALIZATION_RULESET_VERSION,
  normalizeIntake,
  toRawFreeProjection,
} from "./normalize.js";

test("sensitive results carry immutable normalization provenance", () => {
  const result = normalizeIntake(
    {
      animalId: " TEST-001 ",
      species: "canine",
    },
    {
      id: "synthetic-rescue",
      revision: "2026-08-22",
    },
  );

  assert.equal(
    result.provenance.rulesetVersion,
    NORMALIZATION_RULESET_VERSION,
  );
  assert.equal(result.provenance.profile?.id, "synthetic-rescue");
  assert.equal(result.provenance.profile?.revision, "2026-08-22");
  assert.match(
    result.provenance.profile?.digest ?? "",
    /^sha256:[a-f0-9]{64}$/,
  );
});

test("raw-free projections omit raw source values", () => {
  const sensitive = normalizeIntake({
    animalId: " SECRET-ID ",
    species: "doggo",
    owner: {
      email: "private@example.test",
    },
  });

  const rawFree = toRawFreeProjection(sensitive);

  assert.equal("rawRecord" in rawFree, false);
  assert.equal("from" in rawFree.changes[0], false);
  assert.equal("value" in rawFree.warnings[0], false);
  assert.equal(JSON.stringify(rawFree).includes("private@example.test"), false);
});
