**Protocol:** review-protocol.md v1.2

## Review Request — Round 1
**Task:** 1344 — Review the dog-first smart-layer concept and proposed v0.1 intake boundary.
**Protocol:** review-protocol.md v1.2 — respond using the Review Response format.

### Proposed Solution
Keep PetPoint as the authoritative shelter system and place a deterministic normalization boundary above it. Version 0.1 targets dog intake while retaining `species` for future expansion. The proposed normalized core contains nine optional fields: `animalId`, `intakeDate`, `intakeType`, `intakeSubtype`, `species`, `ageGroup`, `sex`, `alteredStatus`, and `weight`. Organization profiles define requiredness and local aliases. All other source fields remain recoverable in `rawRecord`; sensitive, medical, behavioral, identity-description, source, contact, and narrative fields are not standardized in v0.1.

### Relevant Code / Diff

#### Event problem statement — verbatim extraction from `Dogathon Opening Ceremony.pdf`, slides 12–14

```text
PetPoint is our core shelter management system,
the system of record for intake, animal records,
medical, foster, and adoption outcomes.

The Problems with This Shelter System:
01. Inaccessible Data
02. Time-Consuming
03. Unreliable & Outdated
04. Hard to Scale
Intake, medical, foster and adoption
data are not easily accessible. Staff spend too much time on
manual updates instead of care.
Kennel and location updates lag– staff
works with incorrect information.
No program fits the needs of a large
multi-program humane society.

We would love builders to take on a
reliable, interoperable shelter data platform,
or a smart layer that sits on top of PetPoint,
making its data trustworthy and accessible in
near real time.
```

#### Current `CONTEXT.md` — verbatim

```markdown
# Dogathon Context

_Updated: 2026-08-22_

## Terms

**Smart layer** — A trust and interoperability boundary above PetPoint, which remains the shelter system of record. It makes shelter data more consistent and accessible without replacing PetPoint. Implemented first in `src/intake/`.

**Intake draft** — The JSON-shaped source record received before deterministic cleanup. It may contain local aliases, whitespace, or values outside the supported vocabulary.

**Normalized intake record** — The canonical fields the core can derive without guessing. Controlled values follow Shelter Animals Count terminology where represented.

**Normalization result** — The versioned envelope containing the raw snapshot, normalized record, rule-level changes, warnings, errors, and review status.

**Needs review** — A result state indicating that at least one value could not be normalized deterministically. The core preserves and reports that value rather than silently correcting it.

**Normalization profile** — Organization-specific aliases and required fields supplied to the core. Profiles extend local terminology but cannot redefine global canonical values.

**Golden projection** — The stable, review-relevant subset of a normalization result checked into `test-data/expected/` to detect contract drift without duplicating raw input records.

## Sources

- `Dogathon Opening Ceremony.pdf` identifies PetPoint as the rescue’s system of record and calls for a reliable interoperable platform or near-real-time smart layer.
- Shelter Animals Count provides the intake and animal-level vocabulary used by the initial deterministic mappings.

_Anchors: src/intake/normalize.ts::IntakeDraft, src/intake/normalize.ts::NormalizationProfile, src/intake/normalize.ts::NormalizationResult, src/intake/normalize.ts::normalizeIntake, src/intake/evaluate.ts::goldenProjection, src/intake/cli.ts::normalizeNdjson_
```

#### Current ADR — verbatim

```markdown
# ADR: Deterministic Intake Core Before Model Assistance

_Date: 2026-08-22_  
_Status: Accepted_

## Context

The rescue uses PetPoint as its system of record, while manual updates and inconsistent values make operational data unreliable. Free-form model interpretation can help with ambiguity, but applying it to every field would increase cost and make routine transformations harder to audit.

## Decision

Build the smart layer around a stateless, I/O-free normalization function:

- Accept a JSON-shaped intake draft.
- Preserve a raw snapshot.
- Normalize only explicit aliases, safe text boundaries, and field-specific scalar formats.
- Record every changed value with a stable rule identifier.
- Send unrecognized controlled values to human review.
- Allow organization profiles to add aliases and required fields without overriding global vocabulary.
- Version the result contract independently of any API, UI, batch job, or future model adapter.

Model assistance, storage, network access, and PetPoint integration remain outside this core.

## Consequences

The same core can support APIs, batch jobs, forms, browser tools, and workers; the first JSON/NDJSON adapter demonstrates that boundary. Known values are cheap and reproducible to process. Ambiguous data remains visible, but later adapters must provide a review workflow or an explicitly governed model fallback.

_Anchors: src/intake/normalize.ts::INTAKE_SCHEMA_VERSION, src/intake/normalize.ts::NormalizationProfile, src/intake/normalize.ts::normalizeIntake, src/intake/cli.ts::normalizeNdjson_
```

#### Proposed field matrix — verbatim

```markdown
# Dog-First Intake Field Matrix

_Date: 2026-08-22_  
_Status: Boundary recommendation for v0.1_

## Scope

Version 0.1 targets dog intake while retaining an explicit `species` field for future expansion. The normalized core is intentionally small. Fields outside it remain available in `rawRecord`; they are not discarded or silently interpreted.

This matrix describes observed form fields, not an industry standard. Shelter Animals Count terminology guides controlled values where applicable.

## Sources

| Key | Local artifact | Form purpose |
| --- | --- | --- |
| MA | `test-data/source-forms/massachusetts-aco-intake.pdf` | Municipal animal-control intake and disposition |
| CA | `test-data/source-forms/california-oes-animal-intake.pdf` | Emergency intake and temporary housing |
| SP | `test-data/source-forms/save-a-pet-relinquishment.pdf` | Stray and owner relinquishment |
| AP | `test-data/source-forms/aspca-medical-intake.pdf` | Spay/neuter medical intake; adjacent rather than shelter admission |
| ASM | `test-data/source-forms/animal-shelter-manager-intake.html` | Live dog intake or surrender request |

Source URLs and ownership notes are recorded in `test-data/source-forms/README.md`.

## Classification

| Class | Meaning in v0.1 |
| --- | --- |
| Core | Normalized deterministically and included in `normalizedRecord` |
| Profile | Organization-specific requiredness, aliases, or defaults |
| Extension | Preserved in `rawRecord`, but not normalized in v0.1 |
| Sensitive extension | Preserved, access-controlled, and excluded from routine logs or model calls |
| Out of scope | Workflow data that does not describe the intake record |

## Field coverage

### Proposed canonical core

| Canonical field | Evidence | v0.1 treatment | Notes |
| --- | --- | --- | --- |
| `animalId` | MA, AP; generated by shelter systems | Optional core; profile may require | Local/source identifier, not a universal pre-intake value |
| `intakeDate` | MA, CA; requested surrender date in ASM | Optional core; profile may require | ISO date or RFC 3339 timestamp; meaning must be actual intake time |
| `intakeType` | MA, CA, SP; implied by ASM | Controlled core | Distinct from intake method and organization admission policy |
| `intakeSubtype` | CA, SP, ASM | Trimmed core | Primary intake reason; no free-text classification in v0.1 |
| `species` | MA, CA, SP, AP; dog implied by ASM | Controlled core | Dog-first; never infer dog globally when missing |
| `ageGroup` | MA, SP, AP, ASM | Controlled core | SAC groups: neonate, weaned, juvenile, adult, senior |
| `sex` | MA, CA, SP, AP, ASM | Controlled core | Preserve `unknown`; do not infer from name or narrative |
| `alteredStatus` | CA, SP, ASM | Controlled core | Status can change during care; record is intake-time only |
| `weight` | SP | Optional scalar core | Positive numeric lb/kg input normalized to kg |

No field is globally required. Requiredness belongs to an organization profile because request forms, field intake, emergency housing, and completed shelter intake occur at different workflow stages.

### Identity and description extensions

| Observed field group | Evidence | Classification | Rationale |
| --- | --- | --- | --- |
| Animal name | CA, SP, AP | Extension | Strays may be unnamed; spelling is identity data |
| Breed or breed mix | MA, CA, SP, AP, ASM | Extension | Common but unreliable; no agreed deterministic taxonomy selected |
| Color, coat, markings, descriptors | MA, CA, AP | Extension | Useful search descriptors but not minimum intake |
| Microchip, tattoo, license, tags | MA, CA | Sensitive extension | Pseudonymous identifiers with format and registry concerns |
| Photograph or image | Operationally common; not present in extracted fields | Extension | Binary media requires a separate contract |

### Source and intake-event extensions

| Observed field group | Evidence | Classification | Rationale |
| --- | --- | --- | --- |
| Found location and time | MA, CA; narrative in ASM | Extension | Geolocation and custody semantics require a dedicated structure |
| Finder or bringing party | CA, ASM | Sensitive extension | Contains personal contact information |
| Intake method: field, counter, night drop | CA | Profile/extension | Operational workflow, not SAC intake type |
| Transfer organization | MA, CA | Extension | Organization identity and source-system mapping |
| Temporary housing or authority contact | CA | Sensitive extension | Emergency custody and decision authority |

### Medical and behavior extensions

| Observed field group | Evidence | Classification | Rationale |
| --- | --- | --- | --- |
| Vaccinations and veterinary records | MA, CA, SP, AP, ASM | Sensitive extension | Evidence, dates, and clinical terminology require specialist rules |
| Conditions, allergies, diet, medications | CA, SP, AP, ASM | Sensitive extension | Never spell-correct or infer medical facts |
| Bite or aggression history | CA, SP, ASM | Sensitive extension | Consequential legal and safety data requires human review |
| Training, housebreaking, compatibility | SP, ASM | Sensitive extension | Context-dependent behavioral reports, not objective traits |
| Sick/injured and current symptoms | AP, ASM | Sensitive extension | Requires source attribution and clinical review |

### Person, legal, outcome, and payment data

| Observed field group | Evidence | Classification | Rationale |
| --- | --- | --- | --- |
| Owner/finder name, address, phone, email | MA, CA, AP, ASM | Sensitive extension | Direct PII |
| Ownership certification, signature, decision authority | CA, SP | Sensitive extension | Legal workflow |
| Outcome/disposition, adoption, transfer, euthanasia | MA | Out of intake scope | Separate outcome event contract |
| Fees, donations, payment method | MA, SP, AP | Out of scope | Financial workflow |
| Confinement, boarding, daily custody charges | MA | Out of scope | Shelter operations rather than animal intake identity |

### Narrative and test metadata

| Field | Classification | Rationale |
| --- | --- | --- |
| `notes` | Extension | Preserve verbatim; trimming or interpreting unrestricted narrative is not required for the minimum core |
| `_meta` | Out of domain scope | Synthetic-fixture provenance only |

## Fixture disposition

| Fixture field | Disposition |
| --- | --- |
| `animalId`, `intakeType`, `intakeSubtype`, `species`, `ageGroup`, `sex`, `alteredStatus`, `weight` | Core |
| `name`, `breed`, `color` | Extension |
| `foundAt`, `source` | Extension; nested contacts are sensitive |
| `identification` | Sensitive extension |
| `owner` | Sensitive extension |
| `medical`, `behavior` | Sensitive extension |
| `notes` | Extension |
| `_meta` | Test-only metadata |

## Boundary gaps in the current implementation

Before declaring v0.1 frozen:

1. Keep the nine proposed core fields in `normalizedRecord`.
2. Remove top-level `vaccinationsCurrent` and `biteWithinReportingPeriod` from the core contract; they belong in governed extensions.
3. Stop normalizing `notes`; preserve it only in `rawRecord`.
4. Add a fixture with a top-level `intakeDate` so date behavior is represented in golden outputs.
5. Document profile-level dog aliases/defaults without making missing species silently become dog.
6. Keep unknown top-level and nested fields accepted by the draft schema so source data remains recoverable.

## Unresolved terminology

- Whether `intakeSubtype` should be renamed `intakeReason` in a future major version.
- Whether age groups are entered directly or derived from an estimated date of birth.
- Whether sex values need an additional organization-defined state beyond male, female, and unknown.
- Whether intake weight means measured weight or owner/finder estimate.
- Which breed, color, and identifier vocabularies could be adopted without unsafe guessing.
- PetPoint field names, identifiers, timestamps, and export/API shapes remain unverified.

_Anchors: src/intake/normalize.ts::IntakeDraft, src/intake/normalize.ts::NormalizationProfile, src/intake/normalize.ts::NormalizedIntakeRecord, src/intake/normalize.ts::normalizeIntake_
```

### Known Concerns
1. PetPoint field names, identifiers, export/API access, latency, and write capabilities are unverified.
2. The source set is small and heterogeneous; the ASPCA artifact is medical intake rather than shelter admission.
3. Dog-first implementation may accidentally constrain future species support despite retaining `species`.
4. `intakeSubtype` versus `intakeReason` remains unresolved.
5. `ageGroup` may be entered directly or derived from estimated age/date of birth; v0.1 does not decide this.
6. The current implementation still normalizes `notes`, `vaccinationsCurrent`, and `biteWithinReportingPeriod`; it has not yet been aligned to the proposed boundary.

### Specific Questions for Reviewer
1. Is keeping PetPoint authoritative while introducing a deterministic trust boundary a coherent solution to the stated problem?
2. Is the proposed nine-field normalized core appropriately small, or are any included fields unjustified or excluded fields essential?
3. Is preserving all non-core fields only in `rawRecord` sufficiently extensible and safe?
4. Are organization profiles the right place for requiredness and local aliases?
5. Does the dog-first approach preserve a credible path to multi-species support?
6. What conceptual change, if any, should be made before freezing schema v0.1?

## Review Response — Round 1
**Position:** PARTIAL

### Blocking Concerns
B1. `rawRecord` preservation is lossless but not inherently safe. The matrix classifies direct PII, medical, behavioral, and legal data as access-controlled and excluded from routine logs or model calls, yet the proposed result envelope always carries the complete raw record. Before freezing v0.1, either classify the entire envelope as sensitive or separate privileged raw storage/access from the routinely consumable normalized result, with explicit logging, retention, and model-use rules.

B2. Organization profiles are the correct place for local aliases and requiredness, but the result contract needs immutable profile provenance. A profile can change normalization and validation without changing `schemaVersion`; recording its identifier and revision or digest is necessary for reproducibility, auditability, and interpretation of local identifiers such as `animalId`.

B3. Three proposed core fields lack sufficiently stable semantics for a frozen interoperability contract: `intakeSubtype` is unresolved terminology represented as free text, `weight` does not distinguish measured from reported or estimated weight, and `ageGroup` does not distinguish asserted from derived classification. Define these semantics now—such as `intakeReasonText`, weight provenance, and asserted-versus-derived age—or retain the ambiguous fields as extensions. Otherwise the schema implies comparability that the source evidence does not support.

### Non-Blocking Suggestions
S1. Keeping PetPoint authoritative while adding a deterministic normalization boundary is coherent. It addresses consistency and auditability, but should be described as one component of the requested smart layer; it does not by itself solve near-real-time synchronization, stale source data, or accessibility.

S2. The core is appropriately small, and none of the excluded identity, medical, behavioral, contact, narrative, outcome, or payment fields is essential to the initial normalization boundary. The nine-field count is acceptable only after B3 resolves the uncertain field meanings.

S3. Preserving unknown fields in `rawRecord` provides forward compatibility, but not a durable extension contract. Governed, namespaced extensions can be introduced when fields are promoted; they need not enlarge v0.1.

S4. The dog-first approach retains a credible multi-species path because `species` is explicit and missing species is not globally inferred. Any dog-only default should depend on explicit source/profile context, emit provenance, and avoid embedding dog-specific age semantics into global canonical rules.

S5. Before freezing schema v0.1, resolve B1–B3 and align the implementation by removing `notes`, `vaccinationsCurrent`, and `biteWithinReportingPeriod` from the normalized core as already identified.

**Verdict:** REVISE

## Rebuttal — Round 1
**Position:** AGREE

### Responses to Blocking Concerns
Re B1: ACCEPT — carrying `rawRecord` makes the complete normalization envelope sensitive even when the normalized fields are low-risk. We will classify that envelope as sensitive, prohibit routine logging/model use, and define a separate sanitized projection for ordinary consumers.

Re B2: ACCEPT — schema version alone cannot reproduce profile-dependent behavior. We will require immutable normalization provenance containing the ruleset version plus the applied profile ID and revision or digest.

Re B3: ACCEPT — the three fields currently overstate semantic comparability. We will rename free-text `intakeSubtype` to `intakeReasonText`, remove `weight` from the v0.1 normalized core, and define `ageGroup` as a source-asserted intake-time category that v0.1 never derives.

### New Points
R1. The revised v0.1 normalized core contains eight fields: `animalId`, `intakeDate`, `intakeType`, `intakeReasonText`, `species`, `ageGroup`, `sex`, and `alteredStatus`.

R2. `weight`, unrestricted `notes`, medical, behavioral, identity-description, source, contact, and legal fields remain preserved only in the sensitive raw envelope until governed extensions define their semantics.

R3. The deterministic normalizer remains one component of the requested smart layer; near-real-time PetPoint synchronization, freshness, and accessibility remain separate integration concerns.

**Requesting:** RE-REVIEW

## Review Response — Round 2
**Position:** AGREE

### Blocking Concerns
None.

### Non-Blocking Suggestions
None.

### Responses to Prior Points
Re R1: AGREE — the eight-field core is appropriately narrow, and `intakeReasonText` accurately communicates unclassified source text. B3: resolved.

Re R2: AGREE — classifying the raw envelope as sensitive and requiring a separate raw-free projection addresses the safety boundary; moving weight to an extension removes its unsupported semantic comparability. B1: resolved.

Re R3: AGREE — the revised artifacts correctly bound deterministic normalization as one component rather than claiming to solve synchronization, freshness, or accessibility.

B2: resolved — the concept now requires ruleset version, profile ID, and immutable profile revision or digest in result provenance.

**Verdict:** APPROVE
