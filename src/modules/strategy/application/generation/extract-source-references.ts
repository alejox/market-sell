import type { ProposalContent } from "@/modules/strategy/domain/proposal-content.schema";
import type { ResultSnapshot } from "@/modules/results/domain/result-snapshot";

interface ClaimLike {
  factIds?: string[];
}

function isClaimLike(value: unknown): value is ClaimLike {
  return typeof value === "object" && value !== null && "factIds" in value;
}

/** Every claim-shaped field in the proposal content, in source order. */
function claims(content: ProposalContent): ClaimLike[] {
  return [
    content.audienceInsight.operationalProblem,
    content.audienceInsight.desiredOutcome,
    content.audienceInsight.likelyObjection,
    content.audienceInsight.messageAngle,
    content.positioning.promise,
    ...content.positioning.supportingProof,
    content.campaignConcept.coreMessage,
    content.campaignConcept.offerOrCta,
    ...content.creativeBriefs.map((brief) => brief.concept),
    content.paidPromotion.audienceHypothesis,
  ].filter(isClaimLike);
}

/**
 * Auditable list of what a generated proposal draws on: every fact id cited
 * by a claim in the content, every result snapshot id supplied to
 * generation, and — for a revision — the review decision that requested the
 * change. Deduplicated, order-stable.
 */
export function extractSourceReferences(
  content: ProposalContent,
  resultSnapshots: ResultSnapshot[],
  reviewDecisionId: string | null,
): string[] {
  const factIds = claims(content).flatMap((claim) => claim.factIds ?? []);
  const snapshotIds = resultSnapshots.map((snapshot) => snapshot.id);
  const reviewDecisionIds = reviewDecisionId ? [reviewDecisionId] : [];

  return Array.from(new Set([...factIds, ...snapshotIds, ...reviewDecisionIds]));
}
