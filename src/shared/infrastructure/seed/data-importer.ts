import type { ClientRepository } from "@/modules/clients/application/ports/client-repository";
import type { BrandRepository } from "@/modules/clients/application/ports/brand-repository";
import type { AudienceRepository } from "@/modules/strategy/application/ports/audience-repository";
import type { BriefRepository } from "@/modules/strategy/application/ports/brief-repository";
import type { ProposalRepository } from "@/modules/strategy/application/ports/proposal-repository";
import type { ReviewDecisionRepository } from "@/modules/review/application/ports/review-decision-repository";
import type { ResultSnapshotRepository } from "@/modules/results/application/ports/result-snapshot-repository";
import type { Client } from "@/modules/clients/domain/client";
import type { Brand } from "@/modules/clients/domain/brand";
import type { Audience } from "@/modules/strategy/domain/audience";
import type { CampaignBrief } from "@/modules/strategy/domain/campaign-brief";
import type { Proposal } from "@/modules/strategy/domain/proposal";
import type { ReviewDecision } from "@/modules/review/domain/review-decision";
import type { ResultSnapshot } from "@/modules/results/domain/result-snapshot";
import type { IdempotentSeedRepository } from "./ventex-seed";

/**
 * The importer's target repositories. Any backend works as long as it
 * implements both the domain port (for the existence check a dry run needs)
 * and `insertIfAbsent` (JSON, in-memory, and every Supabase adapter added in
 * SB3 all do) — the importer never calls `save`, so it can never overwrite
 * a row that already exists at the destination.
 */
export interface ImportTargets {
  clients: ClientRepository & IdempotentSeedRepository<Client>;
  brands: BrandRepository & IdempotentSeedRepository<Brand>;
  audiences: AudienceRepository & IdempotentSeedRepository<Audience>;
  briefs: BriefRepository & IdempotentSeedRepository<CampaignBrief>;
  proposals: ProposalRepository & IdempotentSeedRepository<Proposal>;
  reviewDecisions: ReviewDecisionRepository & IdempotentSeedRepository<ReviewDecision>;
  resultSnapshots: ResultSnapshotRepository & IdempotentSeedRepository<ResultSnapshot>;
}

/** The source data read from the local `.data` JSON collections (see `read-json-collection.ts`). */
export interface ImportSourceData {
  clients: Client[];
  brands: Brand[];
  audiences: Audience[];
  briefs: CampaignBrief[];
  proposals: Proposal[];
  reviewDecisions: ReviewDecision[];
  resultSnapshots: ResultSnapshot[];
}

export interface CollectionImportReport {
  collection: string;
  /** Populated only in a dry run: ids that do not exist at the destination yet. */
  wouldInsert: string[];
  /** Populated only in a real run: ids this call actually inserted. */
  inserted: string[];
  /** Ids already present at the destination — in a real run, this also absorbs a race with another writer (see below). */
  skippedExisting: string[];
}

export interface ImportReport {
  dryRun: boolean;
  collections: CollectionImportReport[];
}

/**
 * A dry run only reads (one existence check per source row) and never
 * writes. A real run still goes through `insertIfAbsent` rather than
 * trusting the existence check alone — the same defense-in-depth as
 * `ensureVentexSeed`: if another writer inserted the row between the check
 * and the write (e.g. a concurrent import or the owner using the app),
 * `insertIfAbsent` reports it as not-inserted and this importer records it
 * as `skippedExisting` instead of failing or overwriting.
 */
async function importCollection<T extends { id: string }>(
  collection: string,
  items: readonly T[],
  existsAtDestination: (item: T) => Promise<boolean>,
  insertIfAbsent: (item: T) => Promise<boolean>,
  dryRun: boolean,
): Promise<CollectionImportReport> {
  const report: CollectionImportReport = { collection, wouldInsert: [], inserted: [], skippedExisting: [] };

  for (const item of items) {
    if (await existsAtDestination(item)) {
      report.skippedExisting.push(item.id);
      continue;
    }
    if (dryRun) {
      report.wouldInsert.push(item.id);
      continue;
    }
    if (await insertIfAbsent(item)) {
      report.inserted.push(item.id);
    } else {
      report.skippedExisting.push(item.id);
    }
  }

  return report;
}

/**
 * Imports the local `.data` JSON collections into `targets` — used to
 * migrate the pilot owner's existing workspace data into Supabase. Never
 * overwrites a row that already exists at the destination, in a dry run or
 * a real one, and is safe to rerun (a rerun just reports everything as
 * already present). `options.dryRun` defaults to `true` at the CLI layer
 * (see `scripts/import-data.ts`), not here — this function does exactly
 * what it is told.
 */
export async function importWorkspaceData(
  source: ImportSourceData,
  targets: ImportTargets,
  options: { dryRun: boolean },
): Promise<ImportReport> {
  const { dryRun } = options;

  // Sequential, in foreign-key dependency order (client -> brand -> audience
  // -> brief -> proposal -> review decision / result snapshot) — a brand
  // insert must never race ahead of its client's, etc.
  const collections: CollectionImportReport[] = [];

  collections.push(
    await importCollection(
      "clients",
      source.clients,
      async (client) => (await targets.clients.getById(client.id)) !== null,
      (client) => targets.clients.insertIfAbsent(client),
      dryRun,
    ),
  );
  collections.push(
    await importCollection(
      "brands",
      source.brands,
      async (brand) => (await targets.brands.getById(brand.clientId, brand.id)) !== null,
      (brand) => targets.brands.insertIfAbsent(brand),
      dryRun,
    ),
  );
  collections.push(
    await importCollection(
      "audiences",
      source.audiences,
      async (audience) =>
        (await targets.audiences.getById({ clientId: audience.clientId, brandId: audience.brandId }, audience.id)) !== null,
      (audience) => targets.audiences.insertIfAbsent(audience),
      dryRun,
    ),
  );
  collections.push(
    await importCollection(
      "briefs",
      source.briefs,
      async (brief) => (await targets.briefs.getById({ clientId: brief.clientId, brandId: brief.brandId }, brief.id)) !== null,
      (brief) => targets.briefs.insertIfAbsent(brief),
      dryRun,
    ),
  );
  collections.push(
    await importCollection(
      "proposals",
      source.proposals,
      async (proposal) =>
        (await targets.proposals.getById({ clientId: proposal.clientId, brandId: proposal.brandId }, proposal.id)) !== null,
      (proposal) => targets.proposals.insertIfAbsent(proposal),
      dryRun,
    ),
  );
  collections.push(
    await importCollection(
      "review_decisions",
      source.reviewDecisions,
      async (decision) => {
        const scope = { clientId: decision.clientId, brandId: decision.brandId };
        return (await targets.reviewDecisions.listByProposal(scope, decision.proposalId)).some((existing) => existing.id === decision.id);
      },
      (decision) => targets.reviewDecisions.insertIfAbsent(decision),
      dryRun,
    ),
  );
  collections.push(
    await importCollection(
      "result_snapshots",
      source.resultSnapshots,
      async (snapshot) => {
        const scope = { clientId: snapshot.clientId, brandId: snapshot.brandId };
        return (await targets.resultSnapshots.listByProposal(scope, snapshot.proposalId)).some((existing) => existing.id === snapshot.id);
      },
      (snapshot) => targets.resultSnapshots.insertIfAbsent(snapshot),
      dryRun,
    ),
  );

  return { dryRun, collections };
}
