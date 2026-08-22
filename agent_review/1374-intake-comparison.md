**Protocol:** review-protocol.md v1.3

## Review Request — Round 1
**Task:** 1374 — Review intake-versus-normalized comparison UI.
**Protocol:** review-protocol.md v1.3 — respond using the Review Response format.

### Proposed Solution
Retain the editable raw JSON and existing result panels while adding a responsive comparison table for the eight approved v0.1 core fields. For each field, the browser displays:

- The exact value from the immutable submitted JSON snapshot.
- The normalized value from the raw-free API response.
- One outcome: Changed, Unchanged, Missing, Review required, Validation error, or Not normalized.

The comparison is rendered entirely through DOM construction and `textContent`. It is cleared with all other results whenever the source changes, and Playwright verifies changed and ambiguous values plus stale clearing.

### Relevant Code / Diff
The complete actual uncommitted diff is included verbatim at:

`agent_review/1374-round1.diff`

SHA-256:

`a6fe0865360ebad31d6982fae98072fe7336aee5edf22770885eca08f266a9fd`

Length: 299 lines.

The reviewer must inspect the complete diff and current page behavior. Relevant files:

- `public/intake.html`
- `e2e/intake.spec.ts`
- `src/intake/page.test.ts`
- `README.md`

Current verification:

```text
npm run check → pass
51 Node unit/regression tests → pass
4 Playwright Chromium tests → pass
live page refresh → comparison visible
```

### Known Concerns
1. The browser duplicates the eight core field names rather than consuming a generated schema or server metadata.
2. Intake strings are JSON-serialized so surrounding whitespace remains visible, but this also shows quotation marks.
3. Nested or object-valued malformed core fields are rendered as compact JSON in one cell.
4. Extra raw extension fields are intentionally not included in the comparison table.
5. Outcome precedence is error, warning, change, unchanged, intake-only, then missing.
6. Responsive CSS changes table elements to block/grid display at narrow widths.
7. Browser coverage asserts changed and review-required species rows and stale clearing, but not every outcome class.

### Specific Questions for Reviewer
1. Is each outcome classification semantically correct for every presence/change/issue combination?
2. Can the table display intake values from a different snapshot than the normalized response?
3. Can source-controlled values execute markup or corrupt table structure?
4. Does duplicating the core field list create unacceptable contract-drift risk?
5. Are the table and responsive semantics accessible?
6. Is the presentation clear and accurate for a live demonstration?
7. What must change before this feature is approved?

## Review Response — Round 1
**Position:** PARTIAL

### Blocking Concerns
B1. The responsive layout removes accessible header associations. `public/intake.html:258-266` hides the entire `<thead>` and relies on CSS-generated `data-label` content, which is not reliably exposed to assistive technology. Additionally, field names are created as `<td>` elements at `public/intake.html:470-472` rather than row headers. Screen-reader users may therefore hear values without their field or column context. Preserve accessible column headers and use `<th scope="row">` for field cells.

### Non-Blocking Suggestions
S1. Prevent silent contract drift by asserting that `coreFields` matches the properties of `normalized-intake-record-0.1.0.schema.json`, or explicitly reject unsupported `result.schemaVersion` values.

S2. Add tests for unchanged, missing, validation-error, and not-normalized outcomes plus precedence when a field appears in multiple issue/change collections. Current browser coverage exercises only changed and review-required branches.

S3. Extend the XSS test to assert the malicious value is rendered safely in the comparison cell itself. The implementation currently uses fixed DOM construction and `textContent`, so no executable-markup path was found.

**Verdict:** REVISE

## Rebuttal — Round 1
**Position:** AGREE

### Responses to Blocking Concerns
Re B1: ACCEPT — CSS-generated labels are not a substitute for table semantics. The revised table retains visible column headers at narrow widths, uses horizontal overflow for responsiveness, and renders field names as `<th scope="row">`.

### Revised Code / Diff
The complete actual revised feature diff is included verbatim at:

`agent_review/1374-round1-revised.diff`

SHA-256:

`37d7be38592ed1549955a5ac7295cc5850fbccb8e87ad97541fe238ffbba7209`

Length: 450 lines.

It includes accessible table semantics, server-provided core-field metadata, schema-contract parity tests, expanded outcome coverage, and comparison-cell XSS assertions. `npm run check` passes 51 Node tests and 5 Playwright tests.

### New Points
R1. S1 implemented — the examples API now returns a typed `INTAKE_CORE_FIELDS` list; a unit test asserts its IDs exactly match the normalized-record schema properties; the browser consumes this metadata instead of duplicating fields.

R2. S2 implemented — Playwright now covers unchanged, missing, validation-error, and not-normalized outcomes, including error precedence over a simultaneous change.

R3. S3 implemented — the malicious-string regression now asserts both intake and normalized comparison cells use text rendering and contain no image element.

**Requesting:** RE-REVIEW

## Review Response — Round 2
**Position:** PARTIAL

### Blocking Concerns
B2. `coreFields` starts empty while the Normalize button remains enabled; metadata is populated only after the examples request completes (`public/intake.html:365,621-627`). A user who enters JSON and normalizes before that request finishes—or after it fails—gets a successful result with an empty comparison table. Gate normalization on metadata readiness or otherwise ensure fields are available before rendering, and cover the delayed/failing metadata path.

### Non-Blocking Suggestions
None.

### Responses to Prior Points
B1: resolved. The revised code preserves column headers and renders each field as `<th scope="row">`.

Re R1: The typed API metadata and schema-property parity assertion remove the duplicated browser field list. The implementation is correct once metadata loads, but its asynchronous availability introduces B2.

Re R2: Verified. The added Playwright test covers unchanged, missing, validation-error, and not-normalized outcomes, including error precedence over a change.

Re R3: Verified. Both comparison value cells are asserted to render the malicious string as text without creating an image element.

**Verdict:** REVISE

## Rebuttal — Round 2
**Position:** AGREE

### Responses to Blocking Concerns
Re B2: ACCEPT — comparison metadata is a required dependency, so normalization must not run without it. The Normalize button now starts disabled, remains disabled through delayed or failed metadata loading, and is enabled only after a non-empty field list is received. Source invalidation and request completion preserve that readiness gate.

### Revised Code / Diff
The complete actual second revision diff is included verbatim at:

`agent_review/1374-round2-revised.diff`

SHA-256:

`c257462d1e6c68d3a5584fd136f20e131f580cb8f94498a17921530c9fdccd4b`

Length: 514 lines.

It includes metadata readiness gating and two Playwright regressions for delayed and failed metadata loading. `npm run check` passes 51 Node tests and 7 Playwright tests.

### New Points
R4. Metadata shape is also validated before readiness: examples and core fields must both be arrays, and the core field list must be non-empty.

**Requesting:** RE-REVIEW

## Review Response — Round 3
**Position:** PARTIAL

### Blocking Concerns
B2: unresolved. The readiness gate correctly prevents normalization before valid metadata loads, but the complete revised diff and current `e2e/intake.spec.ts` still contain only five Playwright tests. Neither delayed nor failed metadata loading is tested, despite that coverage being part of B2 and the rebuttal claiming seven tests.

### Non-Blocking Suggestions
S4. Restore chronological message order in the review log; Rebuttal Round 2 currently precedes Rebuttal Round 1 and Review Response Round 2.

### Responses to Prior Points
Re R4: The implementation verifies both payload members are arrays and requires a non-empty core-field list before enabling normalization. That behavior resolves the race itself, but the claimed regressions are absent, so B2 cannot be marked resolved.

**Verdict:** REVISE

## Rebuttal — Round 3
**Position:** PARTIAL

### Responses to Blocking Concerns
Re B2: CLARIFY — the two metadata regressions exist in the new file `e2e/intake-metadata.spec.ts`, but the Round 2 diff artifact was generated with `git diff`, which silently omitted that untracked file. The implementation and tests were present; the evidence package was incomplete. The corrected final diff now includes the file verbatim.

### Revised Code / Diff
The complete actual final diff, including the previously omitted new test file, is included verbatim at:

`agent_review/1374-round3-revised.diff`

SHA-256:

`8e97313d4fcfa89612515b0d97953e4f4d4911180e222f8f9afab2127a78b8a8`

Length: 562 lines.

`npm run check` passes 51 Node tests and seven Playwright tests. The browser runner reports two test files: `e2e/intake.spec.ts` with five tests and `e2e/intake-metadata.spec.ts` with two tests.

### New Points
R5. S4 completed — the verbatim prior messages are now ordered Request 1, Response 1, Rebuttal 1, Response 2, Rebuttal 2, Response 3.

**Requesting:** WITHDRAWN

## Escalation Summary
**Unresolved blocking concerns:** B2 — reviewer could not verify metadata regressions because the Round 2 diff artifact omitted an untracked new test file.
**Worker's final position:** The readiness race is fixed and covered by two Playwright tests in `e2e/intake-metadata.spec.ts`. The final diff artifact includes those tests, and the full gate passes 51 Node plus seven Playwright tests.
**Reviewer's final position:** The implementation gate appeared correct, but B2 remained unresolved because the supplied evidence showed only five tests and did not include delayed/failed metadata coverage.
**Decision needed from operator:** Accept the corrected final evidence and treat B2 as satisfied, or require a new formal review task to independently inspect the complete final diff.
