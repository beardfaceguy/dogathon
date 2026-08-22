import { spawnSync } from "node:child_process";

import {
  discoverTestFiles,
  findTestLayoutViolations,
} from "./test-files.js";

const root = process.cwd();
const violations = findTestLayoutViolations(root);
if (violations.length > 0) {
  console.error("TypeScript files in test directories must end in .test.ts or .spec.ts:");
  for (const path of violations) console.error(`- ${path}`);
  process.exit(1);
}

const testFiles = discoverTestFiles(root);
if (testFiles.length === 0) {
  console.error("No .test.ts or .spec.ts files found.");
  process.exit(1);
}

console.log(`Running ${testFiles.length} test files.`);
const run = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...testFiles],
  {
    cwd: root,
    stdio: "inherit",
  },
);
process.exit(run.status ?? 1);
