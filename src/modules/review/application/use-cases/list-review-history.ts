import type { Scope } from "@/shared/scope";
import type { ReviewDecisionRepository } from "@/modules/review/application/ports/review-decision-repository";
import type { ReviewDecision } from "@/modules/review/domain/review-decision";

export interface ListReviewHistoryInput {
  scope: Scope;
  proposalThreadId: string;
}

export interface ListReviewHistoryDependencies {
  reviewDecisions: ReviewDecisionRepository;
}

/**
 * The full review timeline for one proposal thread (every version's
 * approve/request-changes decisions), oldest first. Used to render the
 * review history alongside the version list so an old decision is never
 * lost when a new version is created.
 */
export function createListReviewHistory(deps: ListReviewHistoryDependencies) {
  return async function listReviewHistory(input: ListReviewHistoryInput): Promise<ReviewDecision[]> {
    const decisions = await deps.reviewDecisions.listByThread(input.scope, input.proposalThreadId);
    return [...decisions].sort((a, b) => a.decidedAt.localeCompare(b.decidedAt));
  };
}
