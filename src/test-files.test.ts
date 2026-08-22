import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  discoverTestFiles,
  findTestLayoutViolations,
} from "../scripts/test-files.js";

function withRepository(run: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), "dogathon-test-layout-"));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("discovers test and spec files anywhere outside ignored directories", () => {
  withRepository((root) => {
    mkdirSync(join(root, "src"), { recursive: true });
    mkdirSync(join(root, "tests", "integration"), { recursive: true });
    mkdirSync(join(root, "node_modules", "package"), { recursive: true });
    writeFileSync(join(root, "src", "core.test.ts"), "");
    writeFileSync(join(root, "tests", "integration", "adapter.spec.ts"), "");
    writeFileSync(join(root, "node_modules", "package", "ignored.test.ts"), "");

    assert.deepEqual(discoverTestFiles(root), [
      "src/core.test.ts",
      "tests/integration/adapter.spec.ts",
    ]);
  });
});

test("flags TypeScript files in test directories that the runner would miss", () => {
  withRepository((root) => {
    mkdirSync(join(root, "__tests__"), { recursive: true });
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "__tests__", "covered.test.ts"), "");
    writeFileSync(join(root, "__tests__", "missed.ts"), "");
    writeFileSync(join(root, "__tests__", "fixture.json"), "{}");
    writeFileSync(join(root, "src", "production.ts"), "");

    assert.deepEqual(findTestLayoutViolations(root), [
      "__tests__/missed.ts",
    ]);
  });
});
