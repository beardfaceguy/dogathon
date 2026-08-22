**Protocol:** review-protocol.md v1.2

## Review Request — Round 1
**Task:** 1368 — Review intake demo API contract and security.
**Protocol:** review-protocol.md v1.2 — respond using the Review Response format.

### Proposed Solution
Expose the approved deterministic normalizer through a small Hono sub-application:

- `GET /examples` returns four explicitly synthetic fixture drafts for the browser demo.
- `POST /normalize` accepts one JSON object, rejects malformed/non-object payloads, applies a 100 KB demo limit, normalizes deterministically, and returns only the raw-free restricted projection.
- Both routes set `Cache-Control: no-store`.
- No Arcade, model, Google, Slack, PetPoint, database, or network client is imported.

### Relevant Code / Diff
Review the complete actual current contents of:

- `src/intake/api.ts`
- `src/intake/api.test.ts`
- `src/intake/normalize.ts::normalizeIntake`
- `src/intake/normalize.ts::toRawFreeProjection`
- `test-data/intake-records/*.json`

The exact new API diff is available with:

```bash
git diff -- src/intake/api.ts src/intake/api.test.ts
```

Current verification:

```text
npm run check
Biome: 32 maintained files clean
TypeScript: pass
Test layout: 13 files discovered
Node test runner: 43 tests pass

Live HTTP:
GET /intake → 200
GET /api/intake/examples → four synthetic examples
POST /api/intake/normalize → rawRecord absent
```

### Known Concerns
1. The body-size check occurs after `c.req.text()` has read the body into memory.
2. The examples endpoint reads JSON files synchronously on every request and assumes the process working directory is the repository root.
3. Example fixtures include synthetic contact, medical, behavioral, and identifier fields; they are clearly marked synthetic but still demonstrate sensitive shapes.
4. The API accepts open JSON drafts rather than rejecting malformed field types, because review warnings are part of the product behavior.
5. `needsReview: true` is returned with HTTP 200 because normalization succeeded; callers must inspect the result.
6. Missing or invalid fixture files would currently surface as an unhandled server error.
7. The raw-free projection can still contain identifiers and reason text and is not deidentified or authorization-free.

### Specific Questions for Reviewer
1. Can oversized or malformed requests cause avoidable resource or error-handling problems?
2. Is the API status-code and response contract appropriate?
3. Can any raw or sensitive source value leak unexpectedly?
4. Are synthetic examples served safely and clearly enough?
5. Are cache and content-type behaviors sufficient for this local demo?
6. Is filesystem fixture loading acceptable for the demo boundary?
7. What must change before this API slice is approved?

## Review Response — Round 1
**Position:** DISAGREE

### Blocking Concerns
B1. `src/intake/api.ts:77` passes any parsed object directly to `normalizeIntake`, whose `structuredClone` at `src/intake/normalize.ts:311` can throw on deeply nested valid JSON. A 10,013-byte request with 5,000 nested arrays returned an unstructured HTTP 500 instead of a normalization warning or controlled client error. Add bounded structural validation or otherwise reject excessive nesting, with a regression test.

B2. `src/intake/api.ts:54-55` buffers and decodes the complete request before checking its size. Therefore, the advertised 100 KB limit does not protect memory from arbitrarily large requests. Enforce the limit while reading—or before reading when `Content-Length` is trustworthy—and test oversized fixed-length and streamed bodies.

### Non-Blocking Suggestions
S1. Require a JSON media type and return 415 otherwise. Currently `text/plain` JSON succeeds, allowing cross-origin simple POSTs against the local service.

S2. Resolve fixtures relative to the module and load them once. The current `process.cwd()` dependency and synchronous per-request reads make `/examples` fail with a generic 500 outside the expected working directory.

S3. Explicitly bind the standalone demo to a loopback hostname if “local demo” is a security boundary; omitting `hostname` does not enforce localhost-only access.

**Verdict:** REVISE

## Rebuttal — Round 1
**Position:** AGREE

### Responses to Blocking Concerns
Re B1: ACCEPT — valid JSON can still exceed safe structural depth. We will reject drafts deeper than 64 levels before normalization and add a regression test for deeply nested input.

Re B2: ACCEPT — checking after `text()` is not a memory limit. We will read the request stream incrementally, reject both declared and observed bodies above 100 KB, cancel oversized streams, and test fixed-length and streamed requests.

### New Points
R1. We will implement S1 by requiring `application/json` or a `+json` media type and returning 415 otherwise.

R2. We will implement S2 by resolving fixtures relative to `api.ts` and loading the fixed synthetic examples once at module initialization.

R3. We will implement S3 in the server slice by binding the standalone demo explicitly to `127.0.0.1`.

**Requesting:** RE-REVIEW

## Review Response — Round 2
**Position:** AGREE

### Blocking Concerns
None.

### Non-Blocking Suggestions
None.

### Responses to Prior Points
B1: resolved — depth is iteratively bounded at 64 before normalization, with regression coverage.

B2: resolved — declared and observed sizes are bounded before full buffering; oversized streams are cancelled and tested.

Re R1: JSON and `+json` media types are enforced with 415 otherwise.

Re R2: fixtures are module-relative and loaded once.

Re R3: the standalone server explicitly binds `127.0.0.1`.

**Verdict:** APPROVE
