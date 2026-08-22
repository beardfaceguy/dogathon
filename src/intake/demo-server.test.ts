import assert from "node:assert/strict";
import test from "node:test";

import {
  intakeDemoApp,
  intakeDemoHost,
  intakeDemoPort,
} from "./demo-server.js";

test("credential-free demo server serves the page and intake API", async () => {
  const page = await intakeDemoApp.request("/intake");
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Deterministic intake normalizer/);
  assert.match(html, /Credential-free local demo/);
  assert.doesNotMatch(html, />Operator console</);
  assert.doesNotMatch(html, />Adoption form</);

  const api = await intakeDemoApp.request("/api/intake/normalize", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      animalId: " STANDALONE-001 ",
      species: "canine",
    }),
  });
  assert.equal(api.status, 200);
  const body = await api.json();
  assert.equal(body.result.normalizedRecord.animalId, "STANDALONE-001");
  assert.equal("rawRecord" in body.result, false);
});

test("credential-free demo isolates starter routes", async () => {
  const root = await intakeDemoApp.request("/");
  assert.equal(root.status, 302);
  assert.equal(root.headers.get("location"), "/intake");
  assert.equal((await intakeDemoApp.request("/apply")).status, 404);
  assert.equal((await intakeDemoApp.request("/api/state")).status, 404);
});

test("credential-free demo uses a distinct validated port", () => {
  assert.equal(intakeDemoPort(undefined), 4112);
  assert.equal(intakeDemoPort("8080"), 8080);
  for (const value of ["abc", "1.5", "0", "1023", "65536"]) {
    assert.throws(
      () => intakeDemoPort(value),
      /INTAKE_DEMO_PORT must be an integer from 1024 through 65535/,
    );
  }
});

test("credential-free demo uses a configurable host with a local default", () => {
  assert.equal(intakeDemoHost(undefined), "localhost");
  assert.equal(intakeDemoHost("0.0.0.0"), "0.0.0.0");
  assert.throws(
    () => intakeDemoHost(" "),
    /INTAKE_DEMO_HOST must be a non-empty, trimmed hostname/,
  );
});
