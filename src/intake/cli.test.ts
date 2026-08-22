import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  normalizeJsonDocument,
  normalizeNdjson,
} from "./cli.js";

test("batch adapter normalizes one JSON document", () => {
  const input = readFileSync(
    join(process.cwd(), "test-data", "intake-records", "stray-intake.json"),
    "utf8",
  );

  const record = normalizeJsonDocument(input);

  assert.equal(record.ok, true);
  if (record.ok) {
    assert.equal(record.index, 1);
    assert.equal(record.result.normalizedRecord.animalId, "SF-2026-0042");
  }
});

test("NDJSON adapter isolates malformed records and continues", () => {
  const records = normalizeNdjson(
    [
      JSON.stringify({ animalId: " ONE ", species: "canine" }),
      "{not valid json}",
      JSON.stringify(["arrays are not intake records"]),
      JSON.stringify({ animalId: " TWO ", species: "doggo" }),
    ].join("\n"),
  );

  assert.deepEqual(
    records.map((record) =>
      record.ok
        ? {
            index: record.index,
            ok: true,
            animalId: record.result.normalizedRecord.animalId,
            needsReview: record.result.needsReview,
          }
        : {
            index: record.index,
            ok: false,
            error: record.error,
          },
    ),
    [
      {
        index: 1,
        ok: true,
        animalId: "ONE",
        needsReview: false,
      },
      {
        index: 2,
        ok: false,
        error: "Invalid JSON.",
      },
      {
        index: 3,
        ok: false,
        error: "Intake record must be a JSON object.",
      },
      {
        index: 4,
        ok: true,
        animalId: "TWO",
        needsReview: true,
      },
    ],
  );
});

test("CLI reads one JSON record from stdin", () => {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", "src/intake/cli.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      input: JSON.stringify({ animalId: " STDIN ", species: "canine" }),
    },
  );

  assert.equal(run.status, 0, run.stderr);
  const output = JSON.parse(run.stdout);
  assert.equal(output.ok, true);
  assert.equal("rawRecord" in output.result, false);
  assert.equal("from" in output.result.changes[0], false);
  assert.equal(output.result.normalizedRecord.animalId, "STDIN");
});

test("CLI reads a JSON fixture from a file", () => {
  const run = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "src/intake/cli.ts",
      "test-data/intake-records/owner-surrender-intake.json",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  assert.equal(run.status, 0, run.stderr);
  const output = JSON.parse(run.stdout);
  assert.equal(output.ok, true);
  assert.equal("rawRecord" in output.result, false);
  assert.equal(
    output.result.normalizedRecord.intakeType,
    "relinquished_by_owner",
  );
});
