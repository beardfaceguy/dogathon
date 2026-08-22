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

const unitTests = testFiles.filter((path) => path.endsWith(".test.ts"));
const browserTests = testFiles.filter((path) => path.endsWith(".spec.ts"));

if (unitTests.length > 0) {
  console.log(`Running ${unitTests.length} unit test files.`);
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", "--test", ...unitTests],
    {
      cwd: root,
      stdio: "inherit",
    },
  );
  if (run.status !== 0) process.exit(run.status ?? 1);
}

if (browserTests.length > 0) {
  console.log(`Running ${browserTests.length} browser test files.`);
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const run = spawnSync(
    npx,
    ["playwright", "test", ...browserTests],
    {
      cwd: root,
      stdio: "inherit",
    },
  );
  if (run.status !== 0) process.exit(run.status ?? 1);
}
