import { err, ok, type Result } from "@/shared/result";
import type { Scope } from "@/shared/scope";
import type { Clock } from "@/shared/application/ports/clock";
import type { IdGenerator } from "@/shared/application/ports/id-generator";
import type { BrandRepository } from "@/modules/clients/application/ports/brand-repository";
import type { AudienceRepository } from "@/modules/strategy/application/ports/audience-repository";
import type { BriefRepository } from "@/modules/strategy/application/ports/brief-repository";
import type { ProposalRepository } from "@/modules/strategy/application/ports/proposal-repository";
import type { ResultSnapshotRepository } from "@/modules/results/application/ports/result-snapshot-repository";
import type { GenerationError, ProposalGenerator } from "@/modules/strategy/application/ports/proposal-generator";
import type { Proposal } from "@/modules/strategy/domain/proposal";
import { createRevision } from "@/modules/review/domain/proposal-lifecycle";
import type { InvalidTransitionError } from "@/modules/review/domain/proposal-lifecycle";
import { buildProposalPrompt } from "@/modules/strategy/application/generation/build-proposal-prompt";
import { extractSourceReferences } from "@/modules/strategy/application/generation/extract-source-references";
import type { AudienceNotFoundError, BrandNotFoundError, BriefNotFoundError } from "./generate-proposal";

export interface IterateFromApprovedInput {
  scope: Scope;
  proposalId: string;
}

export interface ProposalNotFoundError {
  kind: "proposal_not_found";
}

export type IterateFromApprovedError =
  | ProposalNotFoundError
  | BriefNotFoundError
  | AudienceNotFoundError
  | BrandNotFoundError
  | InvalidTransitionError
  | GenerationError;

export interface IterateFromApprovedDependencies {
  brands: BrandRepository;
  audiences: AudienceRepository;
  briefs: BriefRepository;
  proposals: ProposalRepository;
  resultSnapshots: ResultSnapshotRepository;
  generator: ProposalGenerator;
  clock: Clock;
  ids: IdGenerator;
}

/**
 * Starts a fresh iteration directly from an already-`approved` version — the
 * T4 decision gap: `reviseProposal` only ever fires from `in_review` because
 * a revision is always feedback-linked. This is for the "new results came
 * in, let's see an updated proposal" flow with no in-between review cycle
 * and no owner feedback to log.
 *
 * Generates version n+1 as a new `draft` with `parentVersion` set to the
 * approved version. No ReviewDecision is recorded (there is no decision to
 * record — the approved version is not being reviewed again), and the
 * approved version itself is never mutated: `createRevision` only ever
 * returns a brand-new object, and this function never re-saves `current`.
 */
export function createIterateFromApproved(deps: IterateFromApprovedDependencies) {
  return async function iterateFromApproved(
    input: IterateFromApprovedInput,
  ): Promise<Result<Proposal, IterateFromApprovedError>> {
    const { scope, proposalId } = input;

    const current = await deps.proposals.getById(scope, proposalId);
    if (!current) {
      return err({ kind: "proposal_not_found" });
    }

    // Fail fast, before any brief/audience/brand lookup or generation call: this use case only
    // ever starts an iteration from an approved version.
    if (current.state !== "approved") {
      return err({ kind: "invalid_transition", from: current.state, action: "create_revision" });
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

    // Every result observed for this thread so far, including anything recorded since approval —
    // this is the whole point of iterating: the new draft should reflect what was learned.
    const resultSnapshots = await deps.resultSnapshots.listByThread(scope, current.proposalThreadId);

    // Not a feedback-driven revision: no OWNER_FEEDBACK/PREVIOUS_PROPOSAL blocks. The model
    // regenerates from the current brief/facts/audience plus the latest observed results.
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
      revision: null,
    });

    const generated = await deps.generator.generate(prompt);
    if (!generated.ok) {
      return err(generated.error);
    }

    const now = deps.clock.now();
    const sourceReferences = extractSourceReferences(generated.value, resultSnapshots, null);
    const revisionResult = createRevision(current, deps.ids.next(), generated.value, sourceReferences, now);
    if (!revisionResult.ok) {
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

    // The approved source version (`current`) is never re-saved — it stays exactly as approved.
    await deps.proposals.save(revision);
    return ok(revision);
  };
}
