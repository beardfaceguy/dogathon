**Protocol:** review-protocol.md v1.3

## Review Request — Round 1
**Task:** 1375 — Fresh final review of intake comparison UI.
**Protocol:** review-protocol.md v1.3 — respond using the Review Response format.

### Proposed Solution
Add a responsive, accessible table that compares the exact submitted intake snapshot with normalized values for the eight schema-defined core fields. Field metadata comes from the API and is asserted against the normalized-record schema. The UI classifies changed, unchanged, missing, validation-error, review-required, and not-normalized outcomes; gates normalization on metadata readiness; clears stale snapshots; and renders all source-controlled values through `textContent`.

### Relevant Code / Diff
The complete actual final diff, including both Playwright files and the previously omitted new metadata test file, is included verbatim at:

`agent_review/1375-final.diff`

SHA-256:

`8e97313d4fcfa89612515b0d97953e4f4d4911180e222f8f9afab2127a78b8a8`

Length: 562 lines.

The reviewer must inspect the entire diff. `npm run check` passes 51 Node tests and seven Playwright tests across two browser test files.

### Known Concerns
1. Comparison metadata loads asynchronously from the examples endpoint.
2. The table uses horizontal overflow at narrow widths to preserve native table semantics.
3. Malformed object-valued core fields render as compact JSON text.
4. Extra extension fields remain visible only in the raw JSON editor.

### Specific Questions for Reviewer
1. Is field metadata contract-safe and readiness-gated?
2. Are outcome precedence and presence semantics correct?
3. Can source and normalized snapshots become mismatched?
4. Are table semantics and responsive behavior accessible?
5. Can source-controlled values execute markup?
6. Do the seven browser regressions adequately cover the feature?
7. What must change before approval?

## Review Response — Round 1
**Position:** PARTIAL

### Blocking Concerns
B1. `public/intake.html:175` assigns the column divider using `:nth-child(odd)`. The new full-width comparison block becomes child 1, shifting subsequent parity: left-column blocks have no divider while right-column blocks receive one. This visibly breaks the desktop results grid. Target the actual left-column blocks instead.

### Non-Blocking Suggestions
S1. Add a layout regression covering the results-grid divider after inserting full-width blocks; current tests only assert structural markup.

S2. `src/intake/api.test.ts:197-200` treats JSON Schema property order as contractual. Compare field-ID sets independently while retaining display order in `INTAKE_CORE_FIELDS`, avoiding failures from semantically irrelevant schema reordering.

**Verdict:** REVISE

## Rebuttal — Round 1
**Position:** AGREE

### Responses to Blocking Concerns
Re B1: ACCEPT — child parity is not a stable layout contract after inserting full-width blocks. The revised markup explicitly marks normalized-record and warning panels as `left-column`; CSS applies the divider only to that class, including the mobile override.

### Revised Code / Diff
The complete actual revised diff, including all new files, is included verbatim at:

`agent_review/1375-round1-revised.diff`

SHA-256:

`62982e6f3f71d9c3d6e2ab983965c0b930a51590efe3c0dd08e27d8930e76edd`

Length: 605 lines.

It contains the explicit layout classes, desktop computed-style regression, order-independent schema-property parity assertion, and all prior comparison tests. `npm run check` passes 51 Node tests and eight Playwright tests.

### New Points
R1. S1 implemented — Playwright verifies a 1px divider on normalized/warnings left panels and no divider on the rules right panel.

R2. S2 implemented — API metadata IDs and schema property names are sorted before set-equivalence comparison; `INTAKE_CORE_FIELDS` retains intentional display order.

**Requesting:** RE-REVIEW

## Review Response — Round 2
**Position:** AGREE

### Blocking Concerns
None.

### Non-Blocking Suggestions
None.

### Responses to Prior Points
B1: resolved. Explicit `left-column` classes correctly bind desktop dividers to the actual left panels, with an appropriate mobile override.

Re R1: Verified. The computed-style Playwright regression covers both left panels and the adjacent right panel.

Re R2: Verified. Sorting both ID lists provides order-independent set-equivalence while preserving intentional metadata display order.

**Verdict:** APPROVE
