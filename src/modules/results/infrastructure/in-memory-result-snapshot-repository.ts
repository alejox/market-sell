import { ScopedRepository } from "@/shared/infrastructure/scoped-repository";
import { InMemoryStore } from "@/shared/infrastructure/in-memory-store";
import type { Scope } from "@/shared/scope";
import type { ResultSnapshotRepository } from "@/modules/results/application/ports/result-snapshot-repository";
import type { ResultSnapshot } from "@/modules/results/domain/result-snapshot";

export class InMemoryResultSnapshotRepository implements ResultSnapshotRepository {
  private readonly repo = new ScopedRepository<ResultSnapshot>(new InMemoryStore<ResultSnapshot>());

  list(scope: Scope): Promise<ResultSnapshot[]> {
    return this.repo.list(scope);
  }

  async listByProposal(scope: Scope, proposalId: string): Promise<ResultSnapshot[]> {
    const all = await this.repo.list(scope);
    return all.filter((snapshot) => snapshot.proposalId === proposalId);
  }

  save(snapshot: ResultSnapshot): Promise<void> {
    return this.repo.save(snapshot);
  }
}
