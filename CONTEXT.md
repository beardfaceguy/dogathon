# Dogathon Context

_Updated: 2026-08-22_

## Terms

**Smart layer** — A trust and interoperability boundary above PetPoint, which remains the shelter system of record. It makes shelter data more consistent and accessible without replacing PetPoint. Implemented first in `src/intake/`.

**Intake draft** — The JSON-shaped source record received before deterministic cleanup. It may contain local aliases, whitespace, or values outside the supported vocabulary.

**Normalized intake record** — The canonical fields the core can derive without guessing. Controlled values follow Shelter Animals Count terminology where represented.

**Normalization result** — The sensitive, versioned envelope containing the raw snapshot, normalized record, rule-level changes, warnings, errors, and review status. Because it contains `rawRecord`, it is not safe for routine logs or model calls.

**Schema version / ruleset version** — The schema version identifies the sensitive/raw-free contract family. The independently evolving semantic ruleset version identifies normalization behavior.

**Needs review** — A result state indicating that at least one value could not be normalized deterministically. The core preserves and reports that value rather than silently correcting it.

**Normalization profile** — Versioned organization-specific aliases and required fields supplied to the core. Profiles extend local terminology but cannot redefine global canonical values; provenance records their non-empty ID/revision and a computed SHA-256 digest of the applied profile.

**Raw-free projection** — The restricted view returned by routine adapters. It omits `rawRecord` and original issue/change values, but it is not deidentified or authorization-free: normalized identifiers, reason text, transformed values, and messages may remain sensitive.

**Intake demo** — A credential-free browser surface at `/intake` that submits synthetic or edited JSON to the deterministic core and presents normalized fields, rule provenance, and review warnings. It demonstrates the smart-layer boundary without claiming PetPoint connectivity.

**Golden projection** — The stable, review-relevant subset of a normalization result checked into `test-data/expected/` to detect contract drift without duplicating raw input records.

## Sources

- `Dogathon Opening Ceremony.pdf` identifies PetPoint as the rescue’s system of record and calls for a reliable interoperable platform or near-real-time smart layer.
- Shelter Animals Count provides the intake and animal-level vocabulary used by the initial deterministic mappings.

_Anchors: src/intake/normalize.ts::IntakeDraft, src/intake/normalize.ts::NormalizationProfile, src/intake/normalize.ts::NormalizationResult, src/intake/normalize.ts::normalizeIntake, src/intake/normalize.ts::toRawFreeProjection, src/intake/api.ts::intakeApi, src/intake/demo-server.ts::intakeDemoApp, src/intake/evaluate.ts::goldenProjection, src/intake/cli.ts::normalizeNdjson_
