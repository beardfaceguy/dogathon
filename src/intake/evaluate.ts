/** Fixture evaluation for the deterministic normalization core.
 *
 * Context: ../../CONTEXT.md
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  normalizeIntake,
  toRawFreeProjection,
  type IntakeDraft,
  type NormalizationResult,
} from "./normalize.js";

export interface EvaluatedFixture {
  name: string;
  result: NormalizationResult;
}

export interface EvaluationReport {
  records: EvaluatedFixture[];
  summary: {
    records: number;
    normalizedFields: number;
    changedFields: number;
    warnings: number;
    errors: number;
    recordsNeedingReview: number;
  };
}

export function goldenProjection(result: NormalizationResult) {
  return toRawFreeProjection(result);
}

export function evaluateFixtureDirectory(directory: string): EvaluationReport {
  const records = readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const draft = JSON.parse(
        readFileSync(resolve(directory, name), "utf8"),
      ) as IntakeDraft;
      return {
        name,
        result: normalizeIntake(draft),
      };
    });

  return {
    records,
    summary: {
      records: records.length,
      normalizedFields: records.reduce(
        (total, record) =>
          total + Object.keys(record.result.normalizedRecord).length,
        0,
      ),
      changedFields: records.reduce(
        (total, record) => total + record.result.changes.length,
        0,
      ),
      warnings: records.reduce(
        (total, record) => total + record.result.warnings.length,
        0,
      ),
      errors: records.reduce(
        (total, record) => total + record.result.errors.length,
        0,
      ),
      recordsNeedingReview: records.filter(
        (record) => record.result.needsReview,
      ).length,
    },
  };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  const directory = resolve(
    process.argv[2] ?? "test-data/intake-records",
  );
  const report = evaluateFixtureDirectory(directory);
  const output = {
    summary: report.summary,
    records: report.records.map(({ name, result }) => ({
      name,
      normalizedFields: Object.keys(result.normalizedRecord).length,
      changedFields: result.changes.length,
      warnings: result.warnings.length,
      errors: result.errors.length,
      needsReview: result.needsReview,
    })),
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}
