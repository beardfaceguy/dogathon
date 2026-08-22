**Protocol:** review-protocol.md v1.3

## Review Request — Round 1
**Task:** 1372 — Review GitHub PR #1, “Add reviewed browser intake demo.”
**Protocol:** review-protocol.md v1.3 — respond using the Review Response format.

### Proposed Solution
PR https://github.com/beardfaceguy/dogathon/pull/1 adds a credential-free browser demonstration of the deterministic shelter-intake normalization boundary while preserving the original starter flows. It includes:

- Hardened raw-free Hono API with media-type, streaming-size, and nesting limits.
- Standalone and starter-integrated `/intake` routes with configurable safe-default hosts.
- Browser UI with source/result binding, cancellation, timeout recovery, restricted-data disclosures, and accessible state.
- Normalization fixes for audit snapshots, alias collisions, and RFC 3339 bounds.
- Repository-wide Node and Playwright regressions run by pre-commit and protected CI.
- Formal review logs for the core, API, server, UI, and vertical integration.

### Relevant Code / Diff
The complete actual PR diff is included verbatim in the companion review artifact:

`agent_review/1372-pr-1.diff`

SHA-256:

`8f91f5a8fa91b3482bc11e3ad1507990f600473cb1a6ea15e844d28ad561cb44`

Length: 2,413 lines.

The reviewer must inspect that entire diff rather than relying on this summary. The source PR can also be queried with:

```bash
gh pr diff 1 --repo beardfaceguy/dogathon
```

Verification attached to the PR:

```text
pre-commit quality gate: pass
51 Node unit/regression tests: pass
4 Playwright Chromium tests: pass
protected GitHub quality workflow: pass
live standalone success and review-required flows: pass
```

### Known Concerns
1. The PR is broad because it contains review-driven normalization fixes, the full browser slice, and its regression infrastructure.
2. Browser code is inline in `public/intake.html`; Playwright covers critical behavior but not every accessibility or visual state.
3. The full starter mode has not been exercised with real Arcade/Google/Slack credentials in this PR.
4. The demo intentionally has no persistence, organization profile, operator overrides, authentication, or PetPoint connection.
5. External host binding is allowed explicitly and documented as unsafe outside a trusted network.
6. Playwright Chromium installation adds CI time and a local browser prerequisite.
7. Generated Repowise and editor-local files were deliberately excluded from the PR.

### Specific Questions for Reviewer
1. Does the complete diff introduce any correctness, security, privacy, concurrency, or data-integrity defect?
2. Can any sensitive raw value cross the raw-free API boundary unexpectedly?
3. Can the UI display stale, mismatched, or executable source-controlled content?
4. Do server defaults and configurable binding behave safely?
5. Are test discovery, pre-commit, and CI wired so regressions cannot be silently skipped?
6. Does the PR regress the original `/`, `/apply`, Arcade, OAuth, or triage flows?
7. Are the documentation and demo claims accurate?
8. What must change before PR #1 is merge-ready?

## Review Response — Round 1
**Position:** DISAGREE

### Blocking Concerns
B1. `src/intake/normalize.ts:8` still emits `NORMALIZATION_RULESET_VERSION = "0.1.0"` even though this PR changes normalization semantics: malformed timestamps previously normalized through JavaScript rollover are now rejected, and colliding profile aliases now fail validation. Since `0.1.0` already exists on `main`, pre- and post-PR behavior produces identical provenance, contradicting the ADR’s requirement that `rulesetVersion` identify normalization behavior. Bump the ruleset version and update provenance fixtures/tests accordingly.

### Non-Blocking Suggestions
S1. `src/intake/api.ts:58-65` returns early for an oversized declared `Content-Length` without cancelling the request body. The focused probe returned 413 with the stream uncancelled. Cancel it and test cancellation so behavior does not depend on the server adapter’s cleanup policy.

S2. `src/intake/normalize.ts:461` rejects second `60`, although RFC 3339 permits leap seconds under constrained circumstances. Either support valid leap-second timestamps or describe the accepted format more narrowly. The current fail-safe review warning makes this non-blocking.

**Verdict:** REVISE

## Rebuttal — Round 1
**Position:** AGREE

### Responses to Blocking Concerns
Re B1: ACCEPT — ruleset `0.1.0` already identifies behavior on `main`, so retaining it would make the strengthened timestamp and alias-collision semantics unreproducible. The implementation now emits `0.2.0`, and all golden provenance fixtures were updated.

### Revised Code / Diff
The complete actual revision diff is included verbatim at:

`agent_review/1372-round1-revision.diff`

SHA-256:

`4ac4150de62de2ae40519565ba639f26a2aa846b298d6d220d63d067aaf19109`

Length: 122 lines.

It contains the ruleset bump, golden provenance changes, declared-body cancellation, its regression test, and narrowed timestamp error wording. `npm run check` passes 51 Node tests and 4 Playwright tests.

### New Points
R1. S1 implemented — declared oversized bodies are now cancelled before returning 413, with a focused cancellation regression.

R2. S2 implemented — the validation message now states that the accepted RFC 3339 subset requires seconds 00 through 59; unsupported leap seconds continue to fail safely into review.

**Requesting:** RE-REVIEW

## Review Response — Round 2
**Position:** AGREE

### Blocking Concerns
None.

### Non-Blocking Suggestions
None.

### Responses to Prior Points
B1: resolved. Ruleset provenance is now `0.2.0`, and all four golden projections were updated consistently.

Re R1: S1 is implemented. Declared oversized bodies are cancelled before returning 413, with regression coverage confirming cancellation.

Re R2: S2 is implemented. The message accurately identifies the supported RFC 3339 subset while leap seconds continue to fail safely into review.

**Verdict:** APPROVE
