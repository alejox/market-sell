import type { Scope } from "@/shared/scope";
import type { ReviewDecision } from "@/modules/review/domain/review-decision";

export interface ReviewDecisionRepository {
  list(scope: Scope): Promise<ReviewDecision[]>;
  listByProposal(scope: Scope, proposalId: string): Promise<ReviewDecision[]>;
  /** Every decision recorded against any version in one proposal thread — the review history timeline. */
  listByThread(scope: Scope, proposalThreadId: string): Promise<ReviewDecision[]>;
  save(decision: ReviewDecision): Promise<void>;
}
