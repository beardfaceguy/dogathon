import assert from "node:assert/strict";
import test from "node:test";

import { intakeApi } from "./api.js";

test("normalization API returns only the raw-free projection", async () => {
  const response = await intakeApi.request("/normalize", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      animalId: " API-001 ",
      species: "canine",
      intakeType: "stray",
    }),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal("rawRecord" in body.result, false);
  assert.equal(body.result.normalizedRecord.animalId, "API-001");
  assert.equal(body.result.normalizedRecord.species, "dog");
  assert.equal(body.result.needsReview, false);
});

test("normalization API exposes review warnings without original values", async () => {
  const response = await intakeApi.request("/normalize", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      species: "doggo",
    }),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.result.needsReview, true);
  assert.equal(body.result.warnings[0].field, "species");
  assert.equal("value" in body.result.warnings[0], false);
});

test("normalization API rejects invalid JSON and non-object inputs", async () => {
  for (const body of ["{broken", "[]", "null"]) {
    const response = await intakeApi.request("/normalize", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body,
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      ok: false,
      error: "Intake record must be a JSON object.",
    });
  }
});

test("normalization API requires a JSON media type", async () => {
  const response = await intakeApi.request("/normalize", {
    method: "POST",
    headers: {
      "content-type": "text/plain",
    },
    body: JSON.stringify({ species: "dog" }),
  });

  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "Content-Type must be application/json.",
  });
});

test("normalization API rejects excessive JSON nesting", async () => {
  let nested: unknown = "value";
  for (let depth = 0; depth < 65; depth += 1) nested = [nested];

  const response = await intakeApi.request("/normalize", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ extension: nested }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "Intake record exceeds the 64-level nesting limit.",
  });
});

test("normalization API rejects oversized fixed and streamed bodies", async () => {
  const oversized = JSON.stringify({
    extension: "x".repeat(100_001),
  });
  const fixed = await intakeApi.request("/normalize", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(oversized)),
    },
    body: oversized,
  });
  assert.equal(fixed.status, 413);

  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"extension":"'));
      controller.enqueue(new Uint8Array(100_001).fill(120));
      controller.enqueue(new TextEncoder().encode('"}'));
      controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request("http://localhost/normalize", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: stream,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  const streamed = await intakeApi.fetch(request);
  assert.equal(streamed.status, 413);
  assert.equal(cancelled, true);

  for (const response of [fixed, streamed]) {
    assert.deepEqual(await response.json(), {
      ok: false,
      error: "Intake record exceeds the 100 KB demo limit.",
    });
  }
});

test("demo API lists the four synthetic intake examples", async () => {
  const response = await intakeApi.request("/examples");

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.deepEqual(
    body.examples.map((example: { id: string }) => example.id),
    ["emergency", "ambiguous", "owner-surrender", "stray"],
  );
  assert.equal(
    body.examples.every(
      (example: { draft: { _meta?: { synthetic?: boolean } } }) =>
        example.draft._meta?.synthetic === true,
    ),
    true,
  );
});
