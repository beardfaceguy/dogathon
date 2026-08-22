**Protocol:** review-protocol.md v1.2

## Review Request — Round 1
**Task:** 1367 — Review intake demo vertical integration across approved sections.
**Protocol:** review-protocol.md v1.2 — respond using the Review Response format.

### Proposed Solution
Compose the separately approved normalization core, API, server, and browser UI into one credential-free vertical slice:

```text
synthetic or edited JSON
  → POST /api/intake/normalize
  → deterministic sensitive result inside process
  → raw-free restricted projection over HTTP
  → normalized fields + rules + warnings + provenance in browser
```

The standalone command defaults to `localhost:4112`; the full starter can expose the same page through its configurable host/port. The slice is read-only and explicitly does not claim authentication, persistence, PetPoint connectivity, or completed human review.

### Relevant Code / Diff
Review only interfaces between these already reviewed sections:

- `public/intake.html` fetch/render flow.
- `src/intake/api.ts` request and response contract.
- `src/intake/demo-server.ts` route composition.
- `src/server.ts` configured-starter route composition.
- `src/intake/normalize.ts::toRawFreeProjection`.
- `src/intake/api.test.ts`, `demo-server.test.ts`, and `page.test.ts`.

Current live evidence:

```text
npm run check → pass, 51 tests
GET http://localhost:4112/intake → 200
page: prototype warning present
page: standalone badge present
page: dead starter links absent
valid POST: normalized dog/stray/id, rawRecord absent, needsReview false
ambiguous POST: species warning visible in response, needsReview true
```

### Known Concerns
1. Inline browser behavior is not executed by an automated DOM/browser harness.
2. The configured starter route has in-memory/static tests but has not been exercised with real Arcade credentials in this slice.
3. The demo applies no organization profile, so required fields are not evaluated.
4. The browser displays review warnings but cannot accept overrides or finalize records.
5. External host binding is configurable and intentionally unsafe without a trusted network; warnings are documented and visible.
6. Synthetic fixture files remain the only example source.

### Specific Questions for Reviewer
1. Do the approved interfaces compose without reintroducing raw-data leakage?
2. Can the browser display a result for a different source snapshot?
3. Are live success and review-required states accurate end to end?
4. Does either server mode break or misrepresent the other?
5. Is the absence of profile validation and operator decisions sufficiently explicit?
6. What must change before the vertical demo slice is approved?

## Review Response — Round 1
**Position:** AGREE

### Blocking Concerns
None.

### Non-Blocking Suggestions
S1. Add browser-level coverage for stale-response rejection and success/review-required rendering; current tests verify wiring but do not execute inline UI behavior.

**Verdict:** APPROVE

## Post-Approval Follow-up
S1 completed. `e2e/intake.spec.ts` now runs in Playwright Chromium and covers success/review rendering, stale-response rejection, timeout recovery, and source-controlled markup safety. The repository-wide test runner, pre-commit hook, and CI quality gate execute these browser regressions.
