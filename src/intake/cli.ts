/** JSON and NDJSON adapter around the pure intake normalizer.
 *
 * Context: ../../CONTEXT.md and ../../docs/adr/2026-08-22-deterministic-intake-core.md
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  normalizeIntake,
  toRawFreeProjection,
  type IntakeDraft,
  type RawFreeNormalizationResult,
} from "./normalize.js";

export type BatchRecord =
  | {
      index: number;
      ok: true;
      result: RawFreeNormalizationResult;
    }
  | {
      index: number;
      ok: false;
      error: string;
    };

function normalizeParsed(value: unknown, index: number): BatchRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      index,
      ok: false,
      error: "Intake record must be a JSON object.",
    };
  }
  return {
    index,
    ok: true,
    result: toRawFreeProjection(normalizeIntake(value as IntakeDraft)),
  };
}

export function normalizeJsonDocument(input: string): BatchRecord {
  try {
    return normalizeParsed(JSON.parse(input), 1);
  } catch {
    return {
      index: 1,
      ok: false,
      error: "Invalid JSON.",
    };
  }
}

export function normalizeNdjson(input: string): BatchRecord[] {
  return input
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line, index) => {
      try {
        return normalizeParsed(JSON.parse(line), index + 1);
      } catch {
        return {
          index: index + 1,
          ok: false,
          error: "Invalid JSON.",
        };
      }
    });
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  const args = process.argv.slice(2);
  const ndjson = args.includes("--ndjson");
  const file = args.find((arg) => !arg.startsWith("--")) ?? "-";
  const input = readFileSync(file === "-" ? 0 : resolve(file), "utf8");
  const output = ndjson
    ? normalizeNdjson(input)
    : [normalizeJsonDocument(input)];

  if (ndjson) {
    process.stdout.write(`${output.map((record) => JSON.stringify(record)).join("\n")}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(output[0], null, 2)}\n`);
  }
  if (output.some((record) => !record.ok)) process.exitCode = 1;
}
