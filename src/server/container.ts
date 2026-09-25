/**
 * SERVER-ONLY composition root: the only place concrete adapters (Supabase
 * or JSON file repositories, the Gemini client) are wired into use cases.
 * Server Actions and route handlers import from here — never from an
 * infrastructure module directly. The `server-only` package is not
 * installed in this project (verified: absent from node_modules and
 * package-lock.json), so this boundary is enforced by convention: nothing
 * under `src/app` or `src/components` may import from
 * `src/modules/**\/infrastructure` or from this file's Gemini/JSON/Supabase
 * adapters directly.
 *
 * Repository selection (see `buildRepositories` below): Supabase is used
 * whenever `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are both set —
 * that is the production adapter (`odd/tasks/supabase-production-persistence.md`).
 * The local JSON file store is only ever used as a local-development
 * fallback when Supabase is not configured, and it is refused outright in a
 * production runtime (Vercel, or `NODE_ENV === "production"`): Vercel's
 * function filesystem is read-only/ephemeral, so a silent fallback there
 * would resurface the exact `ENOENT`/`EROFS` failures this migration exists
 * to fix. No production code path writes to the local filesystem once
 * Supabase is configured, because the JSON adapters are never constructed
 * in that case.
 */
import { collectionFilePath } from "@/shared/infrastructure/data-dir";
import { SystemClock } from "@/shared/infrastructure/system-clock";
import { UuidIdGenerator } from "@/shared/infrastructure/uuid-id-generator";
import { ensureVentexSeed, type IdempotentSeedRepository } from "@/shared/infrastructure/seed/ventex-seed";
import { createSupabaseServerClient } from "@/shared/infrastructure/supabase/server";
import { resolveRepositoryBackend } from "@/server/repository-backend";
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
import { JsonClientRepository } from "@/modules/clients/infrastructure/json-client-repository";
import { JsonBrandRepository } from "@/modules/clients/infrastructure/json-brand-repository";
import { JsonAudienceRepository } from "@/modules/strategy/infrastructure/json-audience-repository";
import { JsonBriefRepository } from "@/modules/strategy/infrastructure/json-brief-repository";
import { JsonProposalRepository } from "@/modules/strategy/infrastructure/json-proposal-repository";
import { JsonReviewDecisionRepository } from "@/modules/review/infrastructure/json-review-decision-repository";
import { JsonResultSnapshotRepository } from "@/modules/results/infrastructure/json-result-snapshot-repository";
import { SupabaseClientRepository } from "@/modules/clients/infrastructure/supabase-client-repository";
import { SupabaseBrandRepository } from "@/modules/clients/infrastructure/supabase-brand-repository";
import { SupabaseAudienceRepository } from "@/modules/strategy/infrastructure/supabase-audience-repository";
import { SupabaseBriefRepository } from "@/modules/strategy/infrastructure/supabase-brief-repository";
import { SupabaseProposalRepository } from "@/modules/strategy/infrastructure/supabase-proposal-repository";
import { SupabaseReviewDecisionRepository } from "@/modules/review/infrastructure/supabase-review-decision-repository";
import { SupabaseResultSnapshotRepository } from "@/modules/results/infrastructure/supabase-result-snapshot-repository";
import { GeminiProposalGenerator } from "@/modules/strategy/infrastructure/gemini-proposal-generator";
import {
  createGenerateProposal,
  type GenerateProposalInput,
} from "@/modules/strategy/application/use-cases/generate-proposal";
import {
  createReviseProposal,
  type ReviseProposalInput,
} from "@/modules/strategy/application/use-cases/revise-proposal";
import { createUpdateBrand, type UpdateBrandInput } from "@/modules/clients/application/use-cases/update-brand";
import {
  createUpdateAudience,
  type UpdateAudienceInput,
} from "@/modules/strategy/application/use-cases/update-audience";
import {
  createUpdateCampaignBrief,
  type UpdateCampaignBriefInput,
} from "@/modules/strategy/application/use-cases/update-campaign-brief";
import {
  createIterateFromApproved,
  type IterateFromApprovedInput,
} from "@/modules/strategy/application/use-cases/iterate-from-approved";
import {
  createSubmitForReview,
  type SubmitForReviewInput,
} from "@/modules/review/application/use-cases/submit-for-review";
import {
  createApproveProposal,
  type ApproveProposalInput,
} from "@/modules/review/application/use-cases/approve-proposal";
import {
  createArchiveProposal,
  type ArchiveProposalInput,
} from "@/modules/review/application/use-cases/archive-proposal";
import {
  createListReviewHistory,
  type ListReviewHistoryInput,
} from "@/modules/review/application/use-cases/list-review-history";
import {
  createRecordResultSnapshot,
  type RecordResultSnapshotInput,
} from "@/modules/results/application/use-cases/record-result-snapshot";
import {
  createListResultSnapshots,
  type ListResultSnapshotsInput,
} from "@/modules/results/application/use-cases/list-result-snapshots";

/**
 * Every repository the app depends on, plus `insertIfAbsent` (see
 * `ventex-seed.ts`/`data-importer.ts`) — every JSON and Supabase adapter
 * implements both, so `ensureWorkspaceSeeded` below works unchanged
 * regardless of which backend `buildRepositories` selects.
 */
interface Repositories {
  clients: ClientRepository & IdempotentSeedRepository<Client>;
  brands: BrandRepository & IdempotentSeedRepository<Brand>;
  audiences: AudienceRepository & IdempotentSeedRepository<Audience>;
  briefs: BriefRepository & IdempotentSeedRepository<CampaignBrief>;
  proposals: ProposalRepository & IdempotentSeedRepository<Proposal>;
  reviewDecisions: ReviewDecisionRepository & IdempotentSeedRepository<ReviewDecision>;
  resultSnapshots: ResultSnapshotRepository & IdempotentSeedRepository<ResultSnapshot>;
}

function buildSupabaseRepositories(): Repositories {
  // Request-scoped: every adapter calls this again for each query, so it
  // always reads the current request's cookies (see `client-provider.ts`).
  const getClient = createSupabaseServerClient;
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

function buildJsonRepositories(): Repositories {
  return {
    clients: new JsonClientRepository(collectionFilePath("clients")),
    brands: new JsonBrandRepository(collectionFilePath("brands")),
    audiences: new JsonAudienceRepository(collectionFilePath("audiences")),
    briefs: new JsonBriefRepository(collectionFilePath("briefs")),
    proposals: new JsonProposalRepository(collectionFilePath("proposals")),
    reviewDecisions: new JsonReviewDecisionRepository(collectionFilePath("review-decisions")),
    resultSnapshots: new JsonResultSnapshotRepository(collectionFilePath("result-snapshots")),
  };
}

function buildRepositories(): Repositories {
  const backend = resolveRepositoryBackend(process.env);
  switch (backend) {
    case "supabase":
      return buildSupabaseRepositories();
    case "json":
      return buildJsonRepositories();
    case "unconfigured-production":
      throw new Error(
        "Supabase is not configured (SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY are missing) and this is a production " +
          "runtime. Refusing to fall back to local JSON file writes, which are not available on Vercel's function " +
          "filesystem. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (see .env.example).",
      );
  }
}

const { clients, brands, audiences, briefs, proposals, reviewDecisions, resultSnapshots } = buildRepositories();

/** Behind the ProposalGenerator port — swapping providers means changing only this line. */
const generator = new GeminiProposalGenerator();
const clock = new SystemClock();
const ids = new UuidIdGenerator();

/** The single local owner identity for this release. Recorded as the approver on every approval. */
const OWNER_NAME = process.env.OWNER_NAME || "Owner";

export const repositories = {
  clients,
  brands,
  audiences,
  briefs,
  proposals,
  reviewDecisions,
  resultSnapshots,
};

/** True once a request has been served without a configured Gemini key. UI code can use this to show the "unavailable" state up front. */
export function isGenerationAvailable(): boolean {
  return generator.isAvailable();
}

let seedOnce: Promise<void> | null = null;

/**
 * Runs the idempotent Ventex seed at most once per process, on whichever
 * request accesses the workspace first. Safe to call repeatedly — every
 * call after the first awaits the same in-flight (or settled) promise.
 * Exported so Server Components can await it before reading `repositories`
 * directly for a plain listing/detail view (no use case needed for a pure
 * read of already-scoped data).
 */
export function ensureWorkspaceSeeded(): Promise<void> {
  if (!seedOnce) {
    seedOnce = ensureVentexSeed({ clients, brands, audiences, briefs }, { owner: process.env.OWNER_NAME || undefined }).then(
      () => undefined,
    );
  }
  return seedOnce;
}

const generateProposalUseCase = createGenerateProposal({
  brands,
  audiences,
  briefs,
  proposals,
  resultSnapshots,
  generator,
  clock,
  ids,
});

const reviseProposalUseCase = createReviseProposal({
  brands,
  audiences,
  briefs,
  proposals,
  reviewDecisions,
  resultSnapshots,
  generator,
  clock,
  ids,
});

const iterateFromApprovedUseCase = createIterateFromApproved({
  brands,
  audiences,
  briefs,
  proposals,
  resultSnapshots,
  generator,
  clock,
  ids,
});

const updateBrandUseCase = createUpdateBrand({ brands, clock });
const updateAudienceUseCase = createUpdateAudience({ audiences, clock });
const updateCampaignBriefUseCase = createUpdateCampaignBrief({ briefs, clock });

const submitForReviewUseCase = createSubmitForReview({ proposals, clock });
const approveProposalUseCase = createApproveProposal({ proposals, reviewDecisions, clock, ids, reviewer: OWNER_NAME });
const archiveProposalUseCase = createArchiveProposal({ proposals, clock });
const listReviewHistoryUseCase = createListReviewHistory({ reviewDecisions });

const recordResultSnapshotUseCase = createRecordResultSnapshot({ proposals, resultSnapshots, clock, ids });
const listResultSnapshotsUseCase = createListResultSnapshots({ resultSnapshots });

/** The owner identity Server Actions should record as the approver / a manual result's `recordedBy`. */
export function currentOwnerName(): string {
  return OWNER_NAME;
}

async function withSeed<T>(run: () => Promise<T>): Promise<T> {
  await ensureWorkspaceSeeded();
  return run();
}

/** Ensures the Ventex seed exists before generating the first proposal for a fresh workspace. */
export function generateProposal(input: GenerateProposalInput) {
  return withSeed(() => generateProposalUseCase(input));
}

/** Ensures the Ventex seed exists before revising a proposal in a fresh workspace. */
export function reviseProposal(input: ReviseProposalInput) {
  return withSeed(() => reviseProposalUseCase(input));
}

export function updateBrand(input: UpdateBrandInput) {
  return withSeed(() => updateBrandUseCase(input));
}

export function updateAudience(input: UpdateAudienceInput) {
  return withSeed(() => updateAudienceUseCase(input));
}

export function updateCampaignBrief(input: UpdateCampaignBriefInput) {
  return withSeed(() => updateCampaignBriefUseCase(input));
}

/** Starts a new iteration directly from an approved version (e.g. after new results). */
export function iterateFromApproved(input: IterateFromApprovedInput) {
  return withSeed(() => iterateFromApprovedUseCase(input));
}

export function submitForReview(input: SubmitForReviewInput) {
  return withSeed(() => submitForReviewUseCase(input));
}

export function approveProposal(input: ApproveProposalInput) {
  return withSeed(() => approveProposalUseCase(input));
}

export function archiveProposal(input: ArchiveProposalInput) {
  return withSeed(() => archiveProposalUseCase(input));
}

export function listReviewHistory(input: ListReviewHistoryInput) {
  return withSeed(() => listReviewHistoryUseCase(input));
}

export function recordResultSnapshot(input: RecordResultSnapshotInput) {
  return withSeed(() => recordResultSnapshotUseCase(input));
}

export function listResultSnapshots(input: ListResultSnapshotsInput) {
  return withSeed(() => listResultSnapshotsUseCase(input));
}
