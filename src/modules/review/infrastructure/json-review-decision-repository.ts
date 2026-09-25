import { ScopedRepository } from "@/shared/infrastructure/scoped-repository";
import { JsonFileStore } from "@/shared/infrastructure/json-file-store";
import type { Scope } from "@/shared/scope";
import type { ReviewDecisionRepository } from "@/modules/review/application/ports/review-decision-repository";
import type { ReviewDecision } from "@/modules/review/domain/review-decision";

export class JsonReviewDecisionRepository implements ReviewDecisionRepository {
  private readonly repo: ScopedRepository<ReviewDecision>;

  constructor(filePath: string) {
    this.repo = new ScopedRepository<ReviewDecision>(new JsonFileStore<ReviewDecision>(filePath));
  }

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
}
