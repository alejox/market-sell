/**
 * One-time migration of the local `.data` JSON collections into Supabase.
 * Run with `npm run import:data -- --dry-run` (the default — reports what
 * would be inserted, writes nothing) or `npm run import:data -- --write`
 * (performs the import for real).
 *
 * Authentication: this script signs in as the owner with
 * `supabase.auth.signInWithPassword()` using `IMPORT_OWNER_EMAIL` /
 * `IMPORT_OWNER_PASSWORD` (server-only env vars, never committed — see
 * `.env.example`) against the public `SUPABASE_PUBLISHABLE_KEY`. This is the
 * exact same authentication path the deployed app uses for the owner, so
 * every write here is bound by the same RLS policies
 * (`supabase/migrations/20260925053019_workspace_schema.sql`) as a request
 * from the app itself — there is no service-role/secret key anywhere in
 * this script, by design (see AGENTS.md "Human-approval boundary" and
 * `odd/tasks/supabase-production-persistence.md`'s constraints).
 *
 * This script runs outside a Next.js request, so it cannot reuse the SSR
 * cookie-based client from `src/shared/infrastructure/supabase/server.ts`;
 * it creates its own plain client and signs in once, then reuses that one
 * authenticated client as every adapter's `SupabaseClientProvider`.
 *
 * No network operation in this file ever overwrites an existing row — every
 * write goes through `insertIfAbsent` (see `data-importer.ts`).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { collectionFilePath } from "@/shared/infrastructure/data-dir";
import { readJsonCollection } from "@/shared/infrastructure/seed/read-json-collection";
import { parseImportArgs } from "@/shared/infrastructure/seed/import-cli-args";
import { importWorkspaceData, type ImportReport, type ImportSourceData, type ImportTargets } from "@/shared/infrastructure/seed/data-importer";
import { SupabaseClientRepository } from "@/modules/clients/infrastructure/supabase-client-repository";
import { SupabaseBrandRepository } from "@/modules/clients/infrastructure/supabase-brand-repository";
import { SupabaseAudienceRepository } from "@/modules/strategy/infrastructure/supabase-audience-repository";
import { SupabaseBriefRepository } from "@/modules/strategy/infrastructure/supabase-brief-repository";
import { SupabaseProposalRepository } from "@/modules/strategy/infrastructure/supabase-proposal-repository";
import { SupabaseReviewDecisionRepository } from "@/modules/review/infrastructure/supabase-review-decision-repository";
import { SupabaseResultSnapshotRepository } from "@/modules/results/infrastructure/supabase-result-snapshot-repository";
import type { Client } from "@/modules/clients/domain/client";
import type { Brand } from "@/modules/clients/domain/brand";
import type { Audience } from "@/modules/strategy/domain/audience";
import type { CampaignBrief } from "@/modules/strategy/domain/campaign-brief";
import type { Proposal } from "@/modules/strategy/domain/proposal";
import type { ReviewDecision } from "@/modules/review/domain/review-decision";
import type { ResultSnapshot } from "@/modules/results/domain/result-snapshot";

async function readSourceData(): Promise<ImportSourceData> {
  return {
    clients: await readJsonCollection<Client>(collectionFilePath("clients")),
    brands: await readJsonCollection<Brand>(collectionFilePath("brands")),
    audiences: await readJsonCollection<Audience>(collectionFilePath("audiences")),
    briefs: await readJsonCollection<CampaignBrief>(collectionFilePath("briefs")),
    proposals: await readJsonCollection<Proposal>(collectionFilePath("proposals")),
    reviewDecisions: await readJsonCollection<ReviewDecision>(collectionFilePath("review-decisions")),
    resultSnapshots: await readJsonCollection<ResultSnapshot>(collectionFilePath("result-snapshots")),
  };
}

async function createAuthenticatedOwnerClient(): Promise<SupabaseClient> {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set to run the importer.");
  }

  const email = process.env.IMPORT_OWNER_EMAIL;
  const password = process.env.IMPORT_OWNER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "IMPORT_OWNER_EMAIL and IMPORT_OWNER_PASSWORD must be set (server-only, never committed — see .env.example). " +
        "The importer authenticates as the owner instead of using a secret/service-role key.",
    );
  }

  const client = createClient(url, publishableKey);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`Owner sign-in failed: ${error.message}`);
  }
  return client;
}

function buildTargets(getClient: () => Promise<SupabaseClient>): ImportTargets {
  return {
    clients: new SupabaseClientRepository(getClient),
    brands: new SupabaseBrandRepository(getClient),
    audiences: new SupabaseAudienceRepository(getClient),
    briefs: new SupabaseBriefRepository(getClient),
    proposals: new SupabaseProposalRepository(getClient),
    reviewDecisions: new SupabaseReviewDecisionRepository(getClient),
    resultSnapshots: new SupabaseResultSnapshotRepository(getClient),
  };
}

function printReport(report: ImportReport): void {
  console.log(`\nImport report (${report.dryRun ? "DRY RUN — no writes were made" : "REAL RUN"}):`);
  for (const collection of report.collections) {
    console.log(`- ${collection.collection}`);
    if (report.dryRun) {
      console.log(`    would insert (${collection.wouldInsert.length}): ${collection.wouldInsert.join(", ") || "none"}`);
    } else {
      console.log(`    inserted (${collection.inserted.length}): ${collection.inserted.join(", ") || "none"}`);
    }
    console.log(`    already at destination, left untouched (${collection.skippedExisting.length}): ${collection.skippedExisting.join(", ") || "none"}`);
  }
  if (report.dryRun) {
    console.log("\nThis was a dry run — nothing was written. Re-run with --write to actually import this data.");
  }
}

async function main(): Promise<void> {
  const { dryRun } = parseImportArgs(process.argv.slice(2));
  const source = await readSourceData();
  const client = await createAuthenticatedOwnerClient();
  const targets = buildTargets(async () => client);

  const report = await importWorkspaceData(source, targets, { dryRun });
  printReport(report);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
