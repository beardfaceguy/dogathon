**Protocol:** review-protocol.md v1.2

## Review Request — Round 1
**Task:** 1349 — Review the versioned intake draft, sensitive result, safe projection, and provenance contracts.
**Protocol:** review-protocol.md v1.2 — respond using the Review Response format.

### Proposed Solution
Implement the concept approved in review task 1344 as three transport-neutral JSON contracts backed by matching TypeScript types:

1. An open `IntakeDraft` that names the eight dog-first v0.1 fields while preserving unknown source fields.
2. A sensitive internal `NormalizationResult` containing `rawRecord`, source-bearing changes/issues, normalized data, review state, schema version, ruleset version, and optional profile ID/revision.
3. A routine-consumer `SafeNormalizationResult` that removes `rawRecord`, original change values, and original issue values.

All normalized fields remain optional globally. Versioned organization profiles define local requiredness and aliases. The CLI now emits only the safe projection.

### Relevant Code / Diff
Review the complete, actual current contents of these files; none is summarized or represented by a generated description:

- `src/intake/normalize.ts` — exported constants and types at lines 5–115; sensitive result construction and `toSafeProjection` at lines 429–473.
- `schemas/intake-draft-0.1.0.schema.json` — complete draft contract.
- `schemas/normalization-result-0.1.0.schema.json` — complete sensitive-result contract.
- `schemas/safe-normalization-result-0.1.0.schema.json` — complete safe-projection contract.
- `src/intake/schema.test.ts` — validates every fixture against draft, sensitive, and safe schemas.
- `src/intake/projection.test.ts` — verifies provenance and absence of raw/original values.
- `src/intake/profile.test.ts` — verifies profile provenance and required-field behavior.
- `src/intake/cli.ts` and `src/intake/cli.test.ts` — verifies routine adapter use of the safe contract.

The exact public TypeScript surface under review is:

```typescript
export const INTAKE_SCHEMA_VERSION = "0.1.0" as const;
export const NORMALIZATION_RULESET_VERSION = "0.1.0" as const;

export type RequiredIntakeField =
  | "animalId"
  | "intakeDate"
  | "intakeType"
  | "intakeReasonText"
  | "species"
  | "ageGroup"
  | "sex"
  | "alteredStatus";

export interface NormalizationProfile {
  id: string;
  revision: string;
  aliases?: NormalizationAliases;
  requiredFields?: RequiredIntakeField[];
}

export interface IntakeDraft {
  ageGroup?: unknown;
  animalId?: unknown;
  alteredStatus?: unknown;
  intakeDate?: unknown;
  intakeReasonText?: unknown;
  sex?: unknown;
  species?: unknown;
  intakeType?: unknown;
  [field: string]: unknown;
}

export interface NormalizedIntakeRecord {
  ageGroup?: CanonicalAgeGroup;
  animalId?: string;
  alteredStatus?: CanonicalAlteredStatus;
  intakeDate?: string;
  intakeReasonText?: string;
  sex?: CanonicalSex;
  species?: CanonicalSpecies;
  intakeType?: CanonicalIntakeType;
}

export interface NormalizationResult {
  schemaVersion: typeof INTAKE_SCHEMA_VERSION;
  provenance: {
    rulesetVersion: typeof NORMALIZATION_RULESET_VERSION;
    profile: {
      id: string;
      revision: string;
    } | null;
  };
  rawRecord: IntakeDraft;
  normalizedRecord: NormalizedIntakeRecord;
  changes: IntakeChange[];
  warnings: IntakeIssue[];
  errors: IntakeIssue[];
  needsReview: boolean;
}

export interface SafeNormalizationResult {
  schemaVersion: typeof INTAKE_SCHEMA_VERSION;
  provenance: NormalizationResult["provenance"];
  normalizedRecord: NormalizedIntakeRecord;
  changes: Array<Omit<IntakeChange, "from">>;
  warnings: Array<Omit<IntakeIssue, "value">>;
  errors: Array<Omit<IntakeIssue, "value">>;
  needsReview: boolean;
}

export function toSafeProjection(
  result: NormalizationResult,
): SafeNormalizationResult {
  return structuredClone({
    schemaVersion: result.schemaVersion,
    provenance: result.provenance,
    normalizedRecord: result.normalizedRecord,
    changes: result.changes.map(({ field, to, ruleId }) => ({
      field,
      to,
      ruleId,
    })),
    warnings: result.warnings.map(({ field, code, message }) => ({
      field,
      code,
      message,
    })),
    errors: result.errors.map(({ field, code, message }) => ({
      field,
      code,
      message,
    })),
    needsReview: result.needsReview,
  });
}
```

### Known Concerns
1. `schemaVersion` and `rulesetVersion` are independently named but both currently equal `0.1.0`.
2. The draft schema permits unknown fields while normalized records reject them.
3. Profile revision is supplied by the caller and has no runtime format validation beyond result-schema checks.
4. “Safe” means raw-free; normalized `animalId`, `intakeReasonText`, and transformed `to` values may still require authorization.
5. Sensitive and safe JSON Schemas duplicate normalized-record and provenance definitions, creating drift risk.
6. The JSON Schema date pattern is intentionally narrower than arbitrary strings but does not independently validate every calendar/timestamp semantic; runtime normalization performs the stronger check.

### Specific Questions for Reviewer
1. Are the TypeScript and JSON Schema contracts semantically aligned?
2. Is separating sensitive and safe results this way sufficient and clearly named?
3. Is the provenance contract enough to reproduce profile-dependent normalization?
4. Are globally optional fields plus profile-required fields the right requiredness model?
5. Is `additionalProperties: true` correct for intake drafts and `false` for normalized results?
6. Should schema and ruleset versions remain separate?
7. What must change before declaring the v0.1 data contract frozen?

## Review Response — Round 1
**Position:** DISAGREE

### Blocking Concerns
1. **B1:** `IntakeDraft` is not aligned with its JSON Schema. TypeScript permits any value for named fields (`unknown`), while the schema permits only strings or null. For example, `normalizeIntake({ animalId: 123 })` is type-valid but produces a `rawRecord` that violates the sensitive-result schema. The public type must match the JSON-shaped schema, or the schema must accept arbitrary JSON values.
2. **B2:** The result schemas accept lexically invalid timestamps. The pattern at `schemas/normalization-result-0.1.0.schema.json:59` and `schemas/safe-normalization-result-0.1.0.schema.json:31` accepts values such as `2026-08-22TgarbageZ`. This is broader than the implementation’s RFC 3339 output and therefore breaks schema/type/implementation alignment.
3. **B3:** Profile provenance is not yet reproducible or fully aligned. `NormalizationProfile.id` and `.revision` permit empty strings in TypeScript, but both result schemas require `minLength: 1`. More importantly, an arbitrary caller-supplied revision does not establish that the exact profile is immutable or retrievable. Before freezing, require non-empty identifiers and define an immutable lookup contract or record a content digest.
4. **B4:** The “safe” contract does not enforce a general security boundary. It is only raw-free: it still carries identifiers, intake reason text, transformed values, and unrestricted `changes[].to` values. Additionally, `toSafeProjection` copies arbitrary issue `message` strings, so a valid caller-constructed `NormalizationResult` can propagate sensitive text. Rename the contract to explicitly indicate “raw-free/restricted,” or constrain and document every retained field so consumers cannot interpret “safe” as deidentified or authorization-free.

### Non-Blocking Suggestions
1. **S1:** Keep schema and ruleset versions separate. Define explicitly whether `schemaVersion` versions the entire sensitive/safe contract family and when changes to either projection require a bump.
2. **S2:** Deduplicate the normalized-record and provenance schema definitions through shared referenced schemas or add contract-equivalence tests; the current copies can drift.
3. **S3:** Globally optional normalized fields, profile-local requiredness, open intake drafts, and closed normalized records are appropriate for the stated boundary once B1 and B3 are resolved.

**Verdict:** REVISE

## Rebuttal — Round 1
**Position:** AGREE

### Responses to Blocking Concerns
Re B1: ACCEPT — pre-normalization fields intentionally accept malformed JSON values so the core can report them. We will replace TypeScript `unknown` with a recursive `JsonValue` contract and allow any JSON value for named draft fields in the draft schema.

Re B2: ACCEPT — the current pattern is too broad. We will use JSON Schema `date`/`date-time` formats and enforce them in tests with `ajv-formats`.

Re B3: ACCEPT — caller labels alone are not immutable provenance. We will reject empty profile IDs/revisions and compute a SHA-256 digest from a canonical serialization of the exact applied profile, then include that digest in sensitive and raw-free provenance.

Re B4: ACCEPT — “safe” overstates the guarantee. We will rename the type, function, and schema to “raw-free,” document that authorization is still required, and avoid any deidentification claim.

### New Points
R1. `schemaVersion` will continue to version the contract family; `rulesetVersion` will version normalization behavior independently.

R2. We will accept S2 by extracting shared normalized-record and provenance JSON Schemas referenced by both result contracts, reducing drift.

R3. Globally optional fields, profile-required fields, open JSON drafts, and closed normalized records remain unchanged as supported by S3.

**Requesting:** RE-REVIEW

## Review Response — Round 3
**Position:** AGREE

### Blocking Concerns
None.

### Non-Blocking Suggestions
None.

### Responses to Prior Points
Re R4: AGREE — profile-bearing sensitive and raw-free results are now schema-validated. S4: resolved.

B5: resolved — the schema accepts independently evolving semantic ruleset versions, production records the current version, and the versioning semantics are documented.

**Verdict:** APPROVE

## Review Response — Round 2
**Position:** PARTIAL

### Blocking Concerns
1. **B5:** Ruleset and schema versions remain operationally coupled. Both TypeScript and `normalization-provenance-0.1.0` require the current ruleset literal. A ruleset-only bump would require mutating the immutable schema at the same `$id` or rejecting otherwise schema-compatible results. Permit independently versioned ruleset values, or explicitly document and implement coupled versioning.

### Non-Blocking Suggestions
1. **S4:** Validate a profile-bearing sensitive and raw-free result against both schemas; current schema fixtures exercise only `profile: null`.

### Responses to Prior Points
Re R1: PARTIAL — separate meanings are appropriate, but B5 prevents actual independent evolution.

Re R2: AGREE — shared provenance and normalized-record schemas resolve the drift concern. S2: resolved.

Re R3: AGREE — the requiredness and openness model remains appropriate. S3: resolved.

B1: resolved — recursive `JsonValue` and open draft field schemas align malformed JSON inputs across TypeScript and JSON Schema.

B2: resolved — shared `date`/`date-time` formats with `ajv-formats` reject malformed timestamps.

B3: resolved — trimmed non-empty identifiers plus a canonical SHA-256 profile digest provide verifiable profile provenance.

B4: resolved — the raw-free rename and explicit restricted-data documentation accurately delimit the security guarantee.

**Verdict:** REVISE

## Rebuttal — Round 2
**Position:** AGREE

### Responses to Blocking Concerns
Re B5: ACCEPT — a schema-family version must not pin one ruleset literal. We will make `rulesetVersion` a semantic-version value in TypeScript and JSON Schema while `normalizeIntake` continues to emit the current `NORMALIZATION_RULESET_VERSION`.

### New Points
R4. We will implement S4 by validating a profile-bearing sensitive result and raw-free projection against both schemas.

**Requesting:** RE-REVIEW
