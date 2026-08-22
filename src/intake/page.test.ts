import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("intake demo page is wired to the raw-free API", () => {
  const page = readFileSync(
    join(process.cwd(), "public", "intake.html"),
    "utf8",
  );
  const server = readFileSync(
    join(process.cwd(), "src", "server.ts"),
    "utf8",
  );

  assert.match(page, /id="source"/);
  assert.match(page, /id="normalize"/);
  assert.match(page, /fetch\("\/api\/intake\/examples"\)/);
  assert.match(page, /fetch\("\/api\/intake\/normalize"/);
  assert.match(page, /new AbortController\(\)/);
  assert.match(page, /source\.addEventListener\("input", \(\) => invalidateResults\(\)\)/);
  assert.match(page, /aria-invalid="false"/);
  assert.match(page, /aria-busy="false"/);
  assert.match(page, /Raw-free output can still contain identifiers and intake reason text/);
  assert.doesNotMatch(page, /<dl id="record">\s*<div/);
  assert.match(page, /Local prototype only: no authentication, persistence, or PetPoint connection/);
  assert.match(page, /<!--INTAKE_NAV-->/);
  assert.doesNotMatch(page, /ARCADE_API_KEY|ANTHROPIC_API_KEY/);
  assert.match(server, /app\.get\("\/intake"/);
  assert.match(server, /app\.route\("\/api\/intake", intakeApi\)/);
  assert.match(server, />Operator console</);
  assert.match(server, />Adoption form</);
  assert.match(server, /hostname: HOST/);
});
