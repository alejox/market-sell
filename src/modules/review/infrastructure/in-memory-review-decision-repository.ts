import { ScopedRepository } from "@/shared/infrastructure/scoped-repository";
import { InMemoryStore } from "@/shared/infrastructure/in-memory-store";
import type { Scope } from "@/shared/scope";
import type { ReviewDecisionRepository } from "@/modules/review/application/ports/review-decision-repository";
import type { ReviewDecision } from "@/modules/review/domain/review-decision";

export class InMemoryReviewDecisionRepository implements ReviewDecisionRepository {
  private readonly repo = new ScopedRepository<ReviewDecision>(new InMemoryStore<ReviewDecision>());

  list(scope: Scope): Promise<ReviewDecision[]> {
    return this.repo.list(scope);
  }

  async listByProposal(scope: Scope, proposalId: string): Promise<ReviewDecision[]> {
    const all = await this.repo.list(scope);
    return all.filter((decision) => decision.proposalId === proposalId);
  }

  async listByThread(scope: Scope, proposalThreadId: string): Promise<ReviewDecision[]> {
    const all = await this.repo.list(scope);
    return all.filter((decision) => decision.proposalThreadId === proposalThreadId);
  }

  save(decision: ReviewDecision): Promise<void> {
    return this.repo.save(decision);
  }

  insertIfAbsent(decision: ReviewDecision): Promise<boolean> {
    return this.repo.insertIfAbsent(decision);
  }
}
