export interface ImportCliOptions {
  dryRun: boolean;
}

/**
 * `scripts/import-data.ts` defaults to a dry run — a caller must pass
 * `--write` explicitly to perform real writes. `--dry-run` is accepted as an
 * explicit no-op for readability (e.g. `npm run import:data -- --dry-run`).
 * Passing both is a usage error: there is no reasonable "mostly dry" run.
 */
export function parseImportArgs(argv: readonly string[]): ImportCliOptions {
  const write = argv.includes("--write");
  const explicitDryRun = argv.includes("--dry-run");
  if (write && explicitDryRun) {
    throw new Error("Pass either --dry-run or --write, not both.");
  }
  return { dryRun: !write };
}
