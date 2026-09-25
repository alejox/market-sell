import assert from "node:assert/strict";
import { test } from "node:test";
import { parseImportArgs } from "./import-cli-args";

test("defaults to dry run with no flags", () => {
  assert.deepEqual(parseImportArgs([]), { dryRun: true });
});

test("--dry-run is an explicit no-op", () => {
  assert.deepEqual(parseImportArgs(["--dry-run"]), { dryRun: true });
});

test("--write turns off dry run", () => {
  assert.deepEqual(parseImportArgs(["--write"]), { dryRun: false });
});

test("passing both --dry-run and --write is a usage error", () => {
  assert.throws(() => parseImportArgs(["--dry-run", "--write"]));
});
