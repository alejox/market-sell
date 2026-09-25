import { err, ok, type Result } from "@/shared/result";
import type { Scope } from "@/shared/scope";
import type { Clock } from "@/shared/application/ports/clock";
import type { IdGenerator } from "@/shared/application/ports/id-generator";
import type { BrandRepository } from "@/modules/clients/application/ports/brand-repository";
import type { AudienceRepository } from "@/modules/strategy/application/ports/audience-repository";
import type { BriefRepository } from "@/modules/strategy/application/ports/brief-repository";
import type { ProposalRepository } from "@/modules/strategy/application/ports/proposal-repository";
import type { ResultSnapshotRepository } from "@/modules/results/application/ports/result-snapshot-repository";
import type { ReviewDecisionRepository } from "@/modules/review/application/ports/review-decision-repository";
import type { GenerationError, ProposalGenerator } from "@/modules/strategy/application/ports/proposal-generator";
import type { Proposal } from "@/modules/strategy/domain/proposal";
import { requestChanges, createRevision, type RequestChangesError } from "@/modules/review/domain/proposal-lifecycle";
import type { ReviewDecision } from "@/modules/review/domain/review-decision";
import { buildProposalPrompt } from "@/modules/strategy/application/generation/build-proposal-prompt";
import { extractSourceReferences } from "@/modules/strategy/application/generation/extract-source-references";
import type { AudienceNotFoundError, BrandNotFoundError, BriefNotFoundError } from "./generate-proposal";

export interface ReviseProposalInput {
  scope: Scope;
  proposalId: string;
  feedback: string;
  reviewer: string;
}

export interface ProposalNotFoundError {
  kind: "proposal_not_found";
}

export type ReviseProposalError =
  | ProposalNotFoundError
  | BriefNotFoundError
  | AudienceNotFoundError
  | BrandNotFoundError
  | RequestChangesError
  | GenerationError;

export interface ReviseProposalDependencies {
  brands: BrandRepository;
  audiences: AudienceRepository;
  briefs: BriefRepository;
  proposals: ProposalRepository;
  reviewDecisions: ReviewDecisionRepository;
  resultSnapshots: ResultSnapshotRepository;
  generator: ProposalGenerator;
  clock: Clock;
  ids: IdGenerator;
}

/**
 * Owner-requested revision: moves the current in-review proposal to
 * `changes_requested`, records the feedback as an auditable ReviewDecision,
 * and generates version n+1 as a new draft with `parentVersion` set —
 * never mutating an already-approved version.
 *
 * Generation is attempted before anything is persisted. Only once a valid
 * revised proposal has been produced does this function write the state
 * transition, the review decision, and the new draft — so an unavailable
 * provider, a timeout, a provider error, or output that never validates
 * leaves every repository untouched.
 */
export function createReviseProposal(deps: ReviseProposalDependencies) {
  return async function reviseProposal(input: ReviseProposalInput): Promise<Result<Proposal, ReviseProposalError>> {
    const { scope, proposalId, feedback, reviewer } = input;

    const current = await deps.proposals.getById(scope, proposalId);
    if (!current) {
      return err({ kind: "proposal_not_found" });
    }

    const now = deps.clock.now();
    const transitioned = requestChanges(current, reviewer, feedback, now);
    if (!transitioned.ok) {
      return err(transitioned.error);
    }

    const brief = await deps.briefs.getById(scope, current.briefId);
    if (!brief) {
      return err({ kind: "brief_not_found" });
    }

    const audience = await deps.audiences.getById(scope, brief.audienceId);
    if (!audience) {
      return err({ kind: "audience_not_found" });
    }

    const brand = await deps.brands.getById(scope.clientId, scope.brandId);
    if (!brand) {
      return err({ kind: "brand_not_found" });
    }

    if (!deps.generator.isAvailable()) {
      return err({ kind: "unavailable" });
    }

    const resultSnapshots = await deps.resultSnapshots.listByProposal(scope, current.id);

    const prompt = buildProposalPrompt({
      brand: { name: brand.name, website: brand.website, voice: brand.voice, constraints: brand.constraints },
      productFacts: brand.productFacts,
      audience: {
        segmentName: audience.segmentName,
        geography: audience.geography,
        pains: audience.pains,
        objections: audience.objections,
        hypotheses: audience.hypotheses,
      },
      brief: {
        objective: brief.objective,
        timeframe: brief.timeframe,
        valueProposition: brief.valueProposition,
        budgetRange: brief.budgetRange,
        missingInformation: brief.missingInformation,
      },
      resultSnapshots,
      revision: { previousContent: current.content, previousVersion: current.version, feedback },
    });

    const generated = await deps.generator.generate(prompt);
    if (!generated.ok) {
      return err(generated.error);
    }

    // Everything above is read-only or pure. Persistence starts here, only
    // after a valid revised proposal exists.
    await deps.proposals.save(transitioned.value);

    const reviewDecision: ReviewDecision = {
      id: deps.ids.next(),
      clientId: scope.clientId,
      brandId: scope.brandId,
      proposalId: current.id,
      proposalThreadId: current.proposalThreadId,
      version: current.version,
      decision: "changes_requested",
      reviewer,
      feedback,
      decidedAt: now,
    };
    await deps.reviewDecisions.save(reviewDecision);

    const sourceReferences = extractSourceReferences(generated.value, resultSnapshots, reviewDecision.id);
    const revisionResult = createRevision(transitioned.value, deps.ids.next(), generated.value, sourceReferences, now);
    if (!revisionResult.ok) {
      // Only reachable if requestChanges above produced a state createRevision then rejects,
      // which cannot happen: requestChanges always yields "changes_requested", one of
      // createRevision's two accepted source states.
      return err(revisionResult.error);
    }

    const revision: Proposal = {
      ...revisionResult.value,
      generation: {
        provider: deps.generator.providerName,
        model: deps.generator.modelId,
        generatedAt: now,
      },
    };

    await deps.proposals.save(revision);
    return ok(revision);
  };
}
