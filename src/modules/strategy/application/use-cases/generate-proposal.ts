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
import { buildProposalPrompt } from "@/modules/strategy/application/generation/build-proposal-prompt";
import { extractSourceReferences } from "@/modules/strategy/application/generation/extract-source-references";

export interface GenerateProposalInput {
  scope: Scope;
  briefId: string;
}

export interface BriefNotFoundError {
  kind: "brief_not_found";
}

export interface AudienceNotFoundError {
  kind: "audience_not_found";
}

export interface BrandNotFoundError {
  kind: "brand_not_found";
}

export type GenerateProposalError = BriefNotFoundError | AudienceNotFoundError | BrandNotFoundError | GenerationError;

export interface GenerateProposalDependencies {
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
 * Generates the first (or, if the brief was regenerated, the next-numbered)
 * draft of a proposal for one campaign brief. Never a revision: a revision
 * always goes through `createReviseProposal`, which is the only path that
 * sets `parentVersion` and links to owner feedback.
 *
 * Availability is checked before touching any repository, and nothing is
 * persisted unless generation actually succeeds and validates.
 */
export function createGenerateProposal(deps: GenerateProposalDependencies) {
  return async function generateProposal(
    input: GenerateProposalInput,
  ): Promise<Result<Proposal, GenerateProposalError>> {
    const { scope, briefId } = input;

    const brief = await deps.briefs.getById(scope, briefId);
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

    // One thread per campaign brief.
    const proposalThreadId = brief.id;
    const existingVersions = await deps.proposals.listByThread(scope, proposalThreadId);
    const latestVersion = existingVersions.reduce((max, proposal) => Math.max(max, proposal.version), 0);

    const resultSnapshots = await deps.resultSnapshots.list(scope);

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
    const proposal: Proposal = {
      id: deps.ids.next(),
      clientId: scope.clientId,
      brandId: scope.brandId,
      briefId: brief.id,
      proposalThreadId,
      version: latestVersion + 1,
      parentVersion: null,
      state: "draft",
      content: generated.value,
      sourceReferences: extractSourceReferences(generated.value, resultSnapshots, null),
      generation: {
        provider: deps.generator.providerName,
        model: deps.generator.modelId,
        generatedAt: now,
      },
      createdAt: now,
      updatedAt: now,
      submittedAt: null,
      approvedAt: null,
      approvedBy: null,
    };

    await deps.proposals.save(proposal);
    return ok(proposal);
  };
}
