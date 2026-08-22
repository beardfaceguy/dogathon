# ADR: Deterministic Intake Core Before Model Assistance

_Date: 2026-08-22_  
_Status: Accepted_

## Context

The rescue uses PetPoint as its system of record, while manual updates and inconsistent values make operational data unreliable. Free-form model interpretation can help with ambiguity, but applying it to every field would increase cost and make routine transformations harder to audit.

## Decision

Build the smart layer around a stateless, I/O-free normalization function:

- Accept a JSON-shaped intake draft.
- Preserve a raw snapshot inside a sensitive internal envelope.
- Provide a separate raw-free restricted projection for routine consumers; it is not deidentified or authorization-free.
- Normalize only explicit aliases, safe text boundaries, and field-specific scalar formats.
- Record every changed value with a stable rule identifier.
- Send unrecognized controlled values to human review.
- Allow versioned organization profiles to add aliases and required fields without overriding global vocabulary.
- Record the ruleset version, non-empty profile ID/revision, and a computed SHA-256 digest of the exact applied profile.
- Version the result contract independently of any API, UI, batch job, or future model adapter.

The v0.1 normalized core is limited to `animalId`, `intakeDate`, `intakeType`, `intakeReasonText`, `species`, `ageGroup`, `sex`, and `alteredStatus`. `intakeReasonText` remains source text rather than a classified subtype. `ageGroup` is source-asserted at intake and is never derived by v0.1.

`schemaVersion` versions the sensitive/raw-free contract family and changes when its shape or field semantics change. `rulesetVersion` is an independently evolving semantic version for normalization behavior; the schema accepts compatible future ruleset versions without changing its own `$id`.

Model assistance, storage, network access, and PetPoint integration remain outside this core.

## Consequences

The same core can support APIs, batch jobs, forms, browser tools, and workers. The JSON/NDJSON adapter emits the raw-free projection; the sensitive internal envelope remains inside the process. Known values are cheap and reproducible to process. Ambiguous data remains visible, but later adapters must provide a review workflow or an explicitly governed model fallback. Near-real-time PetPoint synchronization, freshness, and data access remain separate smart-layer concerns.

_Anchors: src/intake/normalize.ts::INTAKE_SCHEMA_VERSION, src/intake/normalize.ts::NORMALIZATION_RULESET_VERSION, src/intake/normalize.ts::NormalizationProfile, src/intake/normalize.ts::normalizeIntake, src/intake/normalize.ts::toRawFreeProjection, src/intake/cli.ts::normalizeNdjson_
