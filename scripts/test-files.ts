import { readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".husky",
  ".repowise",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

const TEST_DIRECTORIES = new Set(["test", "tests", "__tests__"]);
const TEST_FILE = /\.(?:test|spec)\.ts$/;

function repositoryFiles(root: string): string[] {
  const files: string[] = [];

  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else if (entry.isFile()) {
        files.push(relative(root, path).split(sep).join("/"));
      }
    }
  };

  visit(root);
  return files.sort();
}

export function discoverTestFiles(root: string): string[] {
  return repositoryFiles(root).filter((path) => TEST_FILE.test(path));
}

export function findTestLayoutViolations(root: string): string[] {
  return repositoryFiles(root).filter((path) => {
    if (!path.endsWith(".ts") || TEST_FILE.test(path)) return false;
    return path.split("/").some((segment) => TEST_DIRECTORIES.has(segment));
  });
}
