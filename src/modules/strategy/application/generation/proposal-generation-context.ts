import type { Brand, ProductFact } from "@/modules/clients/domain/brand";
import type { Audience } from "@/modules/strategy/domain/audience";
import type { CampaignBrief } from "@/modules/strategy/domain/campaign-brief";
import type { ProposalContent } from "@/modules/strategy/domain/proposal-content.schema";
import type { ResultSnapshot } from "@/modules/results/domain/result-snapshot";

/**
 * Present only when generating a revision: the prior version's content and
 * the owner's feedback on it. `buildProposalPrompt` uses this to instruct
 * the model to change only what the feedback asks and preserve the rest.
 */
export interface ProposalRevisionContext {
  previousContent: ProposalContent;
  previousVersion: number;
  feedback: string;
}

/**
 * Everything `buildProposalPrompt` needs to assemble one generation
 * request. Assembled by the use cases from repository reads; the prompt
 * builder itself does no I/O.
 */
export interface ProposalGenerationContext {
  brand: Pick<Brand, "name" | "website" | "voice" | "constraints">;
  productFacts: ProductFact[];
  audience: Pick<Audience, "segmentName" | "geography" | "pains" | "objections" | "hypotheses">;
  brief: Pick<
    CampaignBrief,
    "objective" | "timeframe" | "valueProposition" | "budgetRange" | "missingInformation"
  >;
  /** Manually entered, owner-reported results from prior campaigns for this thread. Never live analytics. */
  resultSnapshots: ResultSnapshot[];
  revision: ProposalRevisionContext | null;
}
