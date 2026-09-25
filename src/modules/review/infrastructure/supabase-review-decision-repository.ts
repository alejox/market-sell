import type { ReviewDecisionRepository } from "@/modules/review/application/ports/review-decision-repository";
import type { ReviewDecision, ReviewDecisionKind } from "@/modules/review/domain/review-decision";
import type { Scope } from "@/shared/scope";
import type { SupabaseClientProvider } from "@/shared/infrastructure/supabase/client-provider";
import { ScopedSupabaseRepository } from "@/shared/infrastructure/supabase/scoped-supabase-repository";

const TABLE = "review_decisions";

/** Row shape of `public.review_decisions` (see the workspace schema migration). */
interface ReviewDecisionRow {
  id: string;
  client_id: string;
  brand_id: string;
  proposal_id: string;
  proposal_thread_id: string;
  version: number;
  decision: ReviewDecisionKind;
  reviewer: string;
  feedback: string | null;
  decided_at: string;
}

function fromRow(row: ReviewDecisionRow): ReviewDecision {
  return {
    id: row.id,
    clientId: row.client_id,
    brandId: row.brand_id,
    proposalId: row.proposal_id,
    proposalThreadId: row.proposal_thread_id,
    version: row.version,
    decision: row.decision,
    reviewer: row.reviewer,
    feedback: row.feedback,
    decidedAt: row.decided_at,
  };
}

function toRow(decision: ReviewDecision): ReviewDecisionRow {
  return {
    id: decision.id,
    client_id: decision.clientId,
    brand_id: decision.brandId,
    proposal_id: decision.proposalId,
    proposal_thread_id: decision.proposalThreadId,
    version: decision.version,
    decision: decision.decision,
    reviewer: decision.reviewer,
    feedback: decision.feedback,
    decided_at: decision.decidedAt,
  };
}

export class SupabaseReviewDecisionRepository implements ReviewDecisionRepository {
  private readonly repo: ScopedSupabaseRepository<ReviewDecisionRow, ReviewDecision>;

  constructor(getClient: SupabaseClientProvider) {
    this.repo = new ScopedSupabaseRepository<ReviewDecisionRow, ReviewDecision>(getClient, TABLE, fromRow, toRow);
  }

  list(scope: Scope): Promise<ReviewDecision[]> {
    return this.repo.list(scope);
  }

  listByProposal(scope: Scope, proposalId: string): Promise<ReviewDecision[]> {
    return this.repo.listBy(scope, "proposal_id", proposalId);
  }

  listByThread(scope: Scope, proposalThreadId: string): Promise<ReviewDecision[]> {
    return this.repo.listBy(scope, "proposal_thread_id", proposalThreadId);
  }

  save(decision: ReviewDecision): Promise<void> {
    return this.repo.save(decision);
  }

  /** Never overwrites an existing review decision — used by import, safe under concurrent serverless instances. */
  insertIfAbsent(decision: ReviewDecision): Promise<boolean> {
    return this.repo.insertIfAbsent(decision);
  }
}
