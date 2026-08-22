import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import Ajv, { type AnySchema } from "ajv";
import addFormats from "ajv-formats";

import {
  normalizeIntake,
  toRawFreeProjection,
  type IntakeDraft,
} from "./normalize.js";

const DRAFT_SCHEMA_ID = "https://dogathon.local/schemas/intake-draft-0.1.0.json";
const NORMALIZED_RECORD_SCHEMA_ID = "https://dogathon.local/schemas/normalized-intake-record-0.1.0.json";
const SENSITIVE_RESULT_SCHEMA_ID = "https://dogathon.local/schemas/normalization-result-0.1.0.json";
const RAW_FREE_RESULT_SCHEMA_ID = "https://dogathon.local/schemas/raw-free-normalization-result-0.1.0.json";

function json(path: string): unknown {
  return JSON.parse(readFileSync(join(process.cwd(), path), "utf8"));
}

const draftSchema = json("schemas/intake-draft-0.1.0.schema.json") as AnySchema;
const normalizedRecordSchema = json("schemas/normalized-intake-record-0.1.0.schema.json") as AnySchema;
const provenanceSchema = json("schemas/normalization-provenance-0.1.0.schema.json") as AnySchema;
const sensitiveResultSchema = json("schemas/normalization-result-0.1.0.schema.json") as AnySchema;
const rawFreeResultSchema = json("schemas/raw-free-normalization-result-0.1.0.schema.json") as AnySchema;
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(draftSchema);
ajv.addSchema(normalizedRecordSchema);
ajv.addSchema(provenanceSchema);
ajv.addSchema(sensitiveResultSchema);
ajv.addSchema(rawFreeResultSchema);

const validateDraft = ajv.getSchema(DRAFT_SCHEMA_ID);
const validateNormalizedRecord = ajv.getSchema(NORMALIZED_RECORD_SCHEMA_ID);
const validateSensitiveResult = ajv.getSchema(SENSITIVE_RESULT_SCHEMA_ID);
const validateRawFreeResult = ajv.getSchema(RAW_FREE_RESULT_SCHEMA_ID);

assert.ok(validateDraft);
assert.ok(validateNormalizedRecord);
assert.ok(validateSensitiveResult);
assert.ok(validateRawFreeResult);

const fixtures = [
  "stray-intake.json",
  "owner-surrender-intake.json",
  "emergency-intake.json",
  "malformed-ambiguous-intake.json",
];

test("all synthetic intake drafts satisfy the versioned input schema", () => {
  for (const name of fixtures) {
    const draft = json(`test-data/intake-records/${name}`);
    assert.equal(
      validateDraft(draft),
      true,
      `${name}: ${ajv.errorsText(validateDraft.errors)}`,
    );
  }
});

test("draft schema accepts malformed JSON field values for review", () => {
  assert.equal(
    validateDraft({
      animalId: 123,
      intakeDate: { unparsed: "today" },
      species: ["dog", "maybe"],
    }),
    true,
    ajv.errorsText(validateDraft.errors),
  );
});

test("normalized record schema rejects malformed timestamps", () => {
  assert.equal(
    validateNormalizedRecord({
      intakeDate: "2026-08-22TgarbageZ",
    }),
    false,
  );
});

test("sensitive and raw-free results satisfy their versioned schemas", () => {
  for (const name of fixtures) {
    const draft = json(`test-data/intake-records/${name}`) as IntakeDraft;
    const result = normalizeIntake(draft);
    assert.equal(
      validateSensitiveResult(result),
      true,
      `${name}: ${ajv.errorsText(validateSensitiveResult.errors)}`,
    );
    assert.equal(
      validateRawFreeResult(toRawFreeProjection(result)),
      true,
      `${name}: ${ajv.errorsText(validateRawFreeResult.errors)}`,
    );
  }
});

test("profile-bearing results satisfy sensitive and raw-free schemas", () => {
  const result = normalizeIntake(
    {
      animalId: "TEST-PROFILE-SCHEMA",
      species: "canine",
    },
    {
      id: "synthetic-rescue",
      revision: "2026-08-22",
      requiredFields: ["animalId", "species"],
    },
  );

  assert.equal(
    validateSensitiveResult(result),
    true,
    ajv.errorsText(validateSensitiveResult.errors),
  );
  assert.equal(
    validateRawFreeResult(toRawFreeProjection(result)),
    true,
    ajv.errorsText(validateRawFreeResult.errors),
  );
});
