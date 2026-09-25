/**
 * SERVER-ONLY composition root: the only place concrete adapters (JSON file
 * repositories, the Gemini client) are wired into use cases. Server Actions
 * and route handlers import from here — never from an infrastructure module
 * directly. The `server-only` package is not installed in this project
 * (verified: absent from node_modules and package-lock.json), so this
 * boundary is enforced by convention: nothing under `src/app` or
 * `src/components` may import from `src/modules/**\/infrastructure` or from
 * this file's Gemini/JSON adapters directly.
 */
import { collectionFilePath } from "@/shared/infrastructure/data-dir";
import { SystemClock } from "@/shared/infrastructure/system-clock";
import { UuidIdGenerator } from "@/shared/infrastructure/uuid-id-generator";
import { ensureVentexSeed } from "@/shared/infrastructure/seed/ventex-seed";
import { JsonClientRepository } from "@/modules/clients/infrastructure/json-client-repository";
import { JsonBrandRepository } from "@/modules/clients/infrastructure/json-brand-repository";
import { JsonAudienceRepository } from "@/modules/strategy/infrastructure/json-audience-repository";
import { JsonBriefRepository } from "@/modules/strategy/infrastructure/json-brief-repository";
import { JsonProposalRepository } from "@/modules/strategy/infrastructure/json-proposal-repository";
import { JsonReviewDecisionRepository } from "@/modules/review/infrastructure/json-review-decision-repository";
import { JsonResultSnapshotRepository } from "@/modules/results/infrastructure/json-result-snapshot-repository";
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

const clients = new JsonClientRepository(collectionFilePath("clients"));
const brands = new JsonBrandRepository(collectionFilePath("brands"));
const audiences = new JsonAudienceRepository(collectionFilePath("audiences"));
const briefs = new JsonBriefRepository(collectionFilePath("briefs"));
const proposals = new JsonProposalRepository(collectionFilePath("proposals"));
const reviewDecisions = new JsonReviewDecisionRepository(collectionFilePath("review-decisions"));
const resultSnapshots = new JsonResultSnapshotRepository(collectionFilePath("result-snapshots"));

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
