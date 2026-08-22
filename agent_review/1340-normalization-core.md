**Protocol:** review-protocol.md v1.2

## Review Request — Round 1
**Task:** 1340 — Review deterministic intake normalization behavior and safety guarantees.
**Protocol:** review-protocol.md v1.2 — respond using the Review Response format.

### Proposed Solution
Implement a deterministic, synchronous normalization boundary for JSON-shaped shelter intake drafts. The core:

- Normalizes only the approved eight-field v0.1 boundary.
- Uses fixed global vocabularies plus versioned organization profile aliases.
- Preserves unknown and sensitive source data only in an internal raw envelope.
- Records every transformation and issue.
- Emits profile/ruleset provenance with a canonical SHA-256 digest.
- Provides a raw-free restricted projection for routine adapters.
- Routes ambiguous values to review instead of guessing.

No model, network, database, PetPoint, or other external operation occurs inside normalization.

### Relevant Code / Diff
Review the complete actual current contents of these files, not summaries:

- `src/intake/normalize.ts`
- `src/intake/normalize.test.ts`
- `src/intake/profile.test.ts`
- `src/intake/projection.test.ts`
- `src/intake/scalars.test.ts`
- `src/intake/invariants.test.ts`
- `src/intake/fixtures.test.ts`
- `test-data/intake-records/*.json`
- `test-data/expected/*.normalized.json`

The implementation was introduced after the starter baseline. The exact implementation diff is:

```bash
git diff upstream/main...HEAD -- \
  src/intake/normalize.ts \
  src/intake/normalize.test.ts \
  src/intake/profile.test.ts \
  src/intake/projection.test.ts \
  src/intake/scalars.test.ts \
  src/intake/invariants.test.ts \
  src/intake/fixtures.test.ts \
  test-data/intake-records \
  test-data/expected
```

Current deterministic verification:

```text
npm run check
Biome: 27 files clean
TypeScript: pass
Test layout: 10 files discovered
Node test runner: 34 tests pass
GitHub quality workflow: pass
```

### Known Concerns
1. `src/intake/normalize.ts` contains type contracts, vocabularies, profile hashing, normalization logic, and projection logic in one module.
2. The core imports `node:crypto` for synchronous profile hashing, which constrains browser portability.
3. `ageGroup` is documented as source-asserted, but the runtime value itself carries no basis marker.
4. `intakeReasonText` is trimmed free text and may still contain sensitive information in the raw-free restricted projection.
5. `changes[].to` and issue messages in the raw-free projection may require authorization despite removing original values.
6. Profile identity is validated late, when result provenance is built, after alias tables and normalized values have already been computed in memory.
7. Controlled vocabulary currently includes cat aliases for expansion even though v0.1 is dog-focused.

### Specific Questions for Reviewer
1. Does any rule silently convert ambiguity into false certainty?
2. Are warning, error, and `needsReview` semantics correct and complete?
3. Are date normalization and validation safe across time zones and date-only values?
4. Are profile alias precedence, digest generation, and required-field handling deterministic and auditable?
5. Does the raw-free projection remove the right information without overstating its security?
6. Are mutation safety, idempotence, and stable ordering adequately guaranteed?
7. Should the implementation be split before adding adapters, or is the current module cohesion acceptable?
8. What must change before this normalization implementation is approved?

## Review Response — Round 1
**Position:** DISAGREE

### Blocking Concerns
B1. `normalizeIntake` clones only `rawRecord`; warning `value` fields retain references to nested input objects (`src/intake/normalize.ts:315-321`, `398-404`). Mutating the draft after normalization therefore mutates the returned audit result, violating mutation-safety and snapshot guarantees.

B2. Profile aliases are canonicalized during application but hashed by their original keys (`src/intake/normalize.ts:223-230`, `242-267`). Profiles containing colliding aliases such as `canine_mix` and `canine-mix` produce the same digest but different normalized values depending on insertion order. Provenance therefore cannot reliably identify applied behavior.

B3. Timestamp validation permits out-of-contract values because the regex accepts arbitrary two-digit hours and delegates validation to `Date` (`src/intake/normalize.ts:439-447`). For example, `2026-08-22T24:00Z` is accepted without review and converted to `2026-08-23T00:00:00.000Z`, despite not being a valid RFC 3339 timestamp. This silently converts malformed input into certainty.

### Non-Blocking Suggestions
None.

**Verdict:** REVISE

## Rebuttal — Round 1
**Position:** AGREE

### Responses to Blocking Concerns
Re B1: ACCEPT — the audit envelope must be a complete snapshot, not only `rawRecord`. We will deep-clone the complete result before returning it and add a regression test that mutates a nested invalid input after normalization.

Re B2: ACCEPT — canonical alias collisions make behavior insertion-order-dependent while preserving the same digest. We will validate profiles before applying aliases, reject duplicate canonicalized alias keys, and add order-independent collision tests.

Re B3: ACCEPT — JavaScript date rollover is not RFC 3339 validation. We will constrain hours, minutes, seconds, and offsets lexically before parsing and retain malformed timestamps as review warnings.

### New Points
None.

**Requesting:** RE-REVIEW

## Review Response — Round 2
**Position:** AGREE

### Blocking Concerns
None.

### Non-Blocking Suggestions
None.

### Responses to Prior Points
Re B1: B1: resolved. The complete result is deep-cloned, and the regression test confirms nested warning values remain snapshots.

Re B2: B2: resolved. Profile validation now precedes normalization and rejects canonical alias collisions regardless of insertion order.

Re B3: B3: resolved. Calendar validity and bounded RFC 3339 clock/offset components are checked before parsing.

`npm run check` passes all 37 tests.

**Verdict:** APPROVE
