# ShelterLint

> A deterministic quality gate for cleaner animal intake data.

**[Live Demo](https://shelterlint-dogathon.onrender.com/intake)**

ShelterLint is a dog-first, extensible smart layer for animal shelter intake.
It cleans inconsistent data with deterministic, auditable rules before any AI
is involved. The browser demo places exact intake values beside normalized
values, explains every transformation, and routes ambiguity to human review
instead of guessing.

ShelterLint is designed to complement systems such as PetPoint—not replace
them. The initial boundary follows Shelter Animals Count terminology where
represented and preserves unrestricted source data inside a sensitive internal
envelope while exposing a restricted raw-free projection to routine consumers.

## Demo highlights

- Four synthetic scenarios based on public municipal, emergency, and surrender forms
- Side-by-side intake and normalized values for the eight approved core fields
- Changed, unchanged, missing, validation-error, and review-required outcomes
- Rule-level audit trail and versioned normalization provenance
- Credential-free local and hosted demos with no model or PetPoint dependency

```text
intake JSON → deterministic rules → raw-free comparison → human review
```

## Run locally

```bash
npm install
npx playwright install chromium
npm run demo:intake
```

Open **http://localhost:4112/intake**.

The demo defaults to `localhost`. Use `INTAKE_DEMO_HOST` and
`INTAKE_DEMO_PORT` to override it. External binding exposes an unauthenticated
prototype and should only be used on a trusted network with synthetic data.

## Deterministic core

The v0.1 normalized boundary contains eight fields:

- `animalId`
- `intakeDate`
- `intakeType`
- `intakeReasonText`
- `species`
- `ageGroup`
- `sex`
- `alteredStatus`

Known aliases, whitespace, and timestamps are normalized through explicit
rules. Unknown or ambiguous values remain visible and set `needsReview`
instead of being guessed. Organization profiles can add aliases and required
fields without overriding the global vocabulary.

The internal result retains the full source record for audit and is sensitive.
Browser and CLI consumers receive a raw-free restricted projection that omits
the source record and original issue/change values. It is not deidentified or
authorization-free.

## Commands

```bash
npm run demo:intake
npm run normalize:intake -- test-data/intake-records/stray-intake.json
npm run evaluate:intake
npm run check
```

## Project structure

| Path | Purpose |
| --- | --- |
| `src/intake/normalize.ts` | Deterministic normalization and provenance |
| `src/intake/api.ts` | Bounded raw-free HTTP API |
| `src/intake/demo-server.ts` | Credential-free demo server |
| `public/intake.html` | Interactive comparison UI |
| `schemas/` | Versioned JSON contracts |
| `test-data/` | Public form references, synthetic fixtures, and golden outputs |
| `e2e/` | Playwright browser regressions |
| `agent_review/` | Formal agent-to-agent review logs and exact diffs |

## Development quality

- 51 deterministic Node unit and regression tests
- 10 Playwright Chromium tests covering rendering, retries, stale requests, timeouts, and XSS safety
- Biome linting and strict TypeScript checks
- Pre-commit and protected GitHub CI gates
- A custom formal agent-to-agent review protocol with stable blocker IDs and verified revision rounds

`npm test` discovers every repository-wide `*.test.ts` and `*.spec.ts`. The
pre-commit hook and GitHub Actions run the same complete quality gate.

## Current limitations

- Synthetic demo data only
- No persistence or authentication
- No PetPoint integration
- Human overrides and record finalization are not implemented
- LLM assistance is intentionally deferred behind deterministic rules and human review

## Foundation

This project began from Arcade.dev's Dogathon starter repository. The original
Arcade, MCP, Gmail, Google Sheets, Calendar, Slack, and adoption-application
examples remain in the source tree as optional foundation code, but they are
not part of the ShelterLint demo or its implemented feature claims.
