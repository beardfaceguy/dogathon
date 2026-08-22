**Protocol:** review-protocol.md v1.2

## Review Request — Round 1
**Task:** 1366 — Review intake browser UI safety, accessibility, and presentation accuracy.
**Protocol:** review-protocol.md v1.2 — respond using the Review Response format.

### Proposed Solution
Provide a dependency-free browser page that:

- Loads only synthetic fixture examples.
- Allows operators to edit source JSON.
- Submits to the reviewed raw-free normalization API.
- Displays normalized fields, applied rule IDs, warnings, errors, and provenance.
- Uses `textContent`/DOM construction for all dynamic values.
- Clearly states that it is a local prototype with no authentication, persistence, model, or PetPoint connection.
- Injects valid starter navigation only in configured mode and a local-demo badge in standalone mode.

The page is intentionally read-only: it identifies review needs but cannot yet accept overrides or finalize records.

### Relevant Code / Diff
Review the complete actual current contents of:

- `public/intake.html`
- `src/intake/page.test.ts`
- `src/intake/demo-server.test.ts`
- `src/intake/api.ts`
- `src/intake/api.test.ts`
- `src/server.ts::intakePage`
- `src/intake/demo-server.ts::intakePage`

Exact changes are available with:

```bash
git diff -- public/intake.html src/intake/page.test.ts src/intake/demo-server.test.ts
```

Current verification:

```text
npm run check → pass, 48 tests
Standalone /intake → 200
Starter /intake → 200
All dynamic result values assigned through textContent
Raw record absent from API response
```

### Known Concerns
1. Failed parsing or requests update the status message but leave any previous successful result visible.
2. Browser behavior is covered by static wiring and in-memory HTTP tests, not an automated browser engine.
3. The initial empty state places a `div` inside a `dl`; dynamic normalized records use valid `dt`/`dd` pairs.
4. The page displays potentially sensitive source JSON in the textarea and identifiers/reason text in the raw-free result; it is loopback-only but unauthenticated.
5. The page does not persist, export, accept, or override reviewed values.
6. Fetch calls have no timeout or cancellation.
7. Styling is custom but intentionally aligned with the starter rather than shared.

### Specific Questions for Reviewer
1. Can source or API-controlled text execute as HTML or script?
2. Can stale UI state misrepresent failed or changed normalization?
3. Are accessibility semantics, labels, focus behavior, and status announcements adequate?
4. Are prototype/security limitations visible and accurate?
5. Does the page overstate what “normalization complete” means?
6. Are loading, network failure, malformed input, and empty-result states handled correctly?
7. What must change before this browser slice is approved?

## Review Response — Round 1
**Position:** DISAGREE

### Blocking Concerns
B1. Results are not bound to the source snapshot. Editing or reloading JSON leaves prior results visible, and edits during an in-flight request allow an older response to render as current. Parse/network failures also retain successful output (`public/intake.html:349-375`). This can misrepresent which intake was normalized. Clear or mark results stale on source changes/errors and discard responses whose source snapshot no longer matches.

B2. Empty or unsupported input is presented inaccurately. The API supplies no profile (`src/intake/api.ts:153-156`), so `{}` produces no warnings/errors and `needsReview: false`; the page then reports “Normalization complete” and “Input already matched the canonical form” despite normalizing no fields (`public/intake.html:285-309,343-346`). The validation-errors panel is consequently unreachable for successful API results. Empty-result and no-profile wording must avoid claiming validation or canonical completeness.

B3. The security boundary is insufficiently communicated. Operators can enter real source data, while “raw-free” output may still expose identifiers and reason text. The page states there is no authentication but does not warn that raw-free is neither deidentified nor authorization-free. Additionally, standalone mode binds to loopback, while the full starter omits a hostname (`src/server.ts:295-307`) and may be network-accessible. Require synthetic data or provide an explicit sensitive-data warning, and either enforce loopback/authentication or accurately disclose exposure.

B4. Empty normalized-record states use a text-only `<div>` inside `<dl>` both initially and dynamically (`public/intake.html:245,285-294`). This does not form a valid definition-list name/value group and can produce misleading assistive-technology semantics. Render the empty message outside the `<dl>` or use valid `<dt>/<dd>` markup.

B5. Normalization fetches have no timeout or cancellation (`public/intake.html:359-377`). A stalled request leaves the page permanently at “Normalizing…” with its only action disabled. Add bounded cancellation and a recoverable timeout state.

### Non-Blocking Suggestions
S1. Add browser-level tests covering source changes during requests, stale clearing, malformed/network responses, timeouts, empty objects, and malicious strings. The current page test verifies only static wiring; the 48 passing tests do not execute the DOM behavior.

S2. No executable sink was found for source/API-controlled values: dynamic content uses `textContent`, form properties, and DOM construction. Preserve this boundary. Separately, HTML-escape `ORG` before server-side template replacement so customized branding cannot become markup.

S3. Associate input errors with the textarea using `aria-invalid`/`aria-describedby`; consider `role="alert"` for failures and `aria-busy` during requests.

**Verdict:** REVISE

## Rebuttal — Round 1
**Position:** AGREE

### Responses to Blocking Concerns
Re B1: ACCEPT — displayed output must identify one immutable source snapshot. We will invalidate and clear results on edits/reloads/errors, abort superseded requests, and discard responses when the submitted source no longer matches.

Re B2: ACCEPT — an empty normalized record is not canonical completeness. We will present a distinct “no approved core fields” state, change no-change wording, and disclose that the demo applies no organization profile.

Re B3: ACCEPT — we will add a prominent synthetic-data-only warning, state that raw-free output is still restricted, and bind the full starter server to loopback as documented.

Re B4: ACCEPT — the empty message will be outside the definition list, which will contain only `dt`/`dd` pairs.

Re B5: ACCEPT — requests will use `AbortController` with a bounded timeout, recoverable UI state, and cancellation when source changes.

### New Points
R1. We will implement S2 by HTML-escaping injected organization branding in both servers while retaining `textContent` for all dynamic result data.

R2. We will implement S3 with `aria-invalid`, an associated alert description, dynamic alert/status roles, and `aria-busy`.

R3. S1 is deferred to a browser-harness follow-up; this slice retains static DOM wiring tests, in-memory HTTP tests, live HTTP verification, and direct operator verification.

**Requesting:** RE-REVIEW

## Review Response — Round 2
**Position:** AGREE

### Blocking Concerns
None.

### Non-Blocking Suggestions
None.

### Responses to Prior Points
B1: resolved — source invalidation, request snapshots, version checks, and abort handling prevent stale results.

B2: resolved — empty and no-profile states no longer claim canonical completeness or required-field validation.

B3: resolved — restricted-data warnings are prominent; hosts default safely to localhost, reject accidental empty exposure, and document intentional external binding.

B4: resolved — empty messaging is outside the definition list.

B5: resolved — requests use cancellation, a 10-second timeout, and recoverable UI state.

Re R1: Accepted. Branding is HTML-escaped in both server modes; dynamic values retain safe DOM assignment.

Re R2: Accepted. `aria-invalid`, associated alerts, dynamic status roles, and `aria-busy` are implemented.

Re R3: Accepted. Browser automation remains a worthwhile follow-up but is non-blocking for this dependency-free prototype. Static and in-memory coverage plus the verified 51-test check are adequate for this slice.

**Verdict:** APPROVE
