**Protocol:** review-protocol.md v1.2

## Review Request — Round 1
**Task:** 1365 — Review credential-free demo server and starter-route integration.
**Protocol:** review-protocol.md v1.2 — respond using the Review Response format.

### Proposed Solution
Keep the original starter application intact while exposing the intake demo in two ways:

1. The configured starter server mounts `/intake` and `/api/intake/*` alongside its existing `/` and `/apply` flows.
2. `npm run demo:intake` starts a separate Hono application bound to `127.0.0.1`, serving only the intake page and API without importing Arcade configuration or requiring credentials.

The standalone app redirects `/` to `/intake`; both paths use the same `public/intake.html` and `intakeApi`.

### Relevant Code / Diff
Review the complete actual current contents of:

- `src/intake/demo-server.ts`
- `src/intake/demo-server.test.ts`
- `src/server.ts`
- `src/intake/api.ts`
- `src/intake/page.test.ts`
- `package.json` (`demo:intake` script)

Exact changes are available with:

```bash
git diff -- \
  src/intake/demo-server.ts \
  src/intake/demo-server.test.ts \
  src/server.ts \
  src/intake/page.test.ts \
  package.json
```

Current verification:

```text
npm run check → pass, 46 tests
npm run demo:intake → http://127.0.0.1:4111/intake
GET /intake → 200
GET /api/intake/examples → four examples
POST /api/intake/normalize → rawRecord absent
```

### Known Concerns
1. `demo-server.ts` resolves `public/intake.html` from `process.cwd()`, so launching the script outside the repository root would fail.
2. The standalone server validates neither non-numeric nor privileged `INTAKE_DEMO_PORT` values before passing them to the Node server.
3. The full starter still requires Arcade environment values before any route, including `/intake`, can be served; the standalone command is the credential-free path.
4. Page-serving logic is duplicated between `server.ts` and `demo-server.ts`.
5. The intake API loads its fixed fixture set when imported by either server.
6. The standalone server is intentionally loopback-only and is not a deployment configuration.
7. No persistence, authentication, or operator decisions are implemented.

### Specific Questions for Reviewer
1. Is the standalone server genuinely credential-independent?
2. Can it accidentally bind beyond loopback or collide with the configured starter?
3. Are route mounting and import side effects safe for the original starter?
4. Should page-serving logic or application construction be shared before approval?
5. Are working-directory and port assumptions acceptable for the demo command?
6. Does any current behavior misleadingly imply deployment readiness?
7. What must change before this server slice is approved?

## Review Response — Round 1
**Position:** PARTIAL

### Blocking Concerns
B1. `src/intake/demo-server.ts:26` defaults to port 4111, identical to `src/config.ts:37`. The standalone demo therefore deterministically collides with the starter server under default settings. Use a distinct default port or provide explicit collision handling.

B2. The standalone page exposes starter-only navigation: `public/intake.html:220-221` links to the operator console and adoption form, but `/` redirects back to `/intake` and `/apply` returns 404. This makes the credential-free demo visibly broken. Hide or adapt those links for standalone mode.

### Non-Blocking Suggestions
S1. Validate `INTAKE_DEMO_PORT` as an integer in the supported range and emit an actionable startup error. The fixed `127.0.0.1` hostname otherwise prevents binding beyond loopback.

S2. Add tests for the root redirect, starter-route isolation (`/apply` and `/api/state` return 404), and startup port handling. The current test exercises only the in-memory Hono application.

S3. Credential independence is concrete: the standalone import graph reaches `dogs.ts`, `intake/api.ts`, and `intake/normalize.ts`, but not `config.ts` or Arcade modules. The focused test also passes with Arcade environment variables removed.

S4. The `process.cwd()` page path is acceptable for the documented npm script because npm runs scripts from the package root. Resolve relative to `import.meta.url` only if direct invocation outside npm is intended.

S5. Sharing page-serving code is unnecessary before approval; the small duplication avoids coupling the standalone application to starter configuration.

S6. Add visible demo-only wording and replace “Ready for downstream use” with less production-suggestive copy. Loopback binding is safe, but the page itself does not disclose its lack of authentication, persistence, or deployment hardening.

**Verdict:** REVISE

## Rebuttal — Round 1
**Position:** AGREE

### Responses to Blocking Concerns
Re B1: ACCEPT — the standalone and configured starter should be runnable together. We will move the standalone default to port 4112 and document it.

Re B2: ACCEPT — standalone mode must not render dead starter navigation. We will inject mode-specific navigation: starter links in the configured server and a standalone-demo badge in the credential-free server.

### New Points
R1. We will implement S1 with an exported integer/range validator for ports 1024–65535 and actionable errors.

R2. We will implement S2 with redirect, route-isolation, and port-validation regression tests.

R3. We will implement S6 with visible local-demo limitations and replace downstream-readiness wording with neutral normalization-complete wording.

R4. We accept S4 and S5: npm-root page resolution and small page-serving duplication remain intentional.

**Requesting:** RE-REVIEW

## Review Response — Round 2
**Position:** AGREE

### Blocking Concerns
None.

### Non-Blocking Suggestions
None.

### Responses to Prior Points
B1: resolved — validated port 4112 removes the default starter collision.

B2: resolved — mode-specific injection removes dead standalone navigation.

Re R1: Port validation correctly enforces integers from 1024 through 65535 with an actionable error.

Re R2: Redirect, route-isolation, and port-validation regressions are now covered.

Re R3: The page clearly states local-prototype limitations and uses neutral completion wording.

Re R4: The retained npm-root resolution and small serving duplication remain appropriate.

The full check passes all 48 tests.

**Verdict:** APPROVE

## Review Request — Round 3
**Task:** 1365 — Re-review operator-directed configurable hostname change.
**Protocol:** review-protocol.md v1.2 — respond using the Review Response format.

### Proposed Solution
After Round 2 approval, the operator required hostname addresses not be hardcoded. Both servers now use configurable hostnames with safe local defaults:

- Standalone: `INTAKE_DEMO_HOST`, default `localhost`.
- Full starter: `HOST`, default `localhost`.
- Standalone port remains validated and defaults to 4112.
- Empty/whitespace standalone hosts are rejected.
- README warns that external binding exposes an unauthenticated prototype.

### Relevant Code / Diff

```bash
git diff -- src/intake/demo-server.ts src/intake/demo-server.test.ts src/config.ts src/server.ts README.md
```

### Known Concerns
1. Operators can intentionally bind to `0.0.0.0` or another external interface.
2. The full starter `HOST` value is not validated beyond its default.
3. `localhost` may resolve to IPv4 or IPv6 depending on the host environment.

### Specific Questions for Reviewer
1. Does configurability preserve the safe default without misleading operators?
2. Is the external-binding warning sufficient for this local prototype?
3. Does this post-approval change introduce a new blocker?

## Review Response — Round 3
**Position:** PARTIAL

### Blocking Concerns
B3. `src/config.ts:38` accepts an empty `HOST`. Node treats `host: ""` as an unspecified address and binds to `::`, exposing the full starter externally. This bypasses the intended safe local default accidentally. Apply the standalone non-empty, trimmed-host validation to `HOST` and add regression coverage.

### Non-Blocking Suggestions
None.

### Responses to Prior Points
B1: remains resolved.

B2: remains resolved.

The README warning sufficiently covers intentional external binding, and `localhost` is a safe loopback default. The 50-test check passes, but B3 means the configurable-host delta does not yet preserve approval.

**Verdict:** REVISE

## Rebuttal — Round 3
**Position:** AGREE

### Responses to Blocking Concerns
Re B3: ACCEPT — an empty hostname can accidentally widen exposure. We will share the same non-empty, trimmed-host validator between standalone and full-server configuration and add regression coverage for `HOST`.

### New Points
R5. No fourth reviewer round is requested. Accepting the only remaining blocker with this concrete revision plan establishes consensus under the protocol.

**Requesting:** WITHDRAWN
