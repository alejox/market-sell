import type { Scope } from "@/shared/scope";
import type { ReviewDecision } from "@/modules/review/domain/review-decision";

export interface ReviewDecisionRepository {
  list(scope: Scope): Promise<ReviewDecision[]>;
  listByProposal(scope: Scope, proposalId: string): Promise<ReviewDecision[]>;
  save(decision: ReviewDecision): Promise<void>;
}
