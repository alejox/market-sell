import { ScopedRepository } from "@/shared/infrastructure/scoped-repository";
import { JsonFileStore } from "@/shared/infrastructure/json-file-store";
import type { Scope } from "@/shared/scope";
import type { ResultSnapshotRepository } from "@/modules/results/application/ports/result-snapshot-repository";
import type { ResultSnapshot } from "@/modules/results/domain/result-snapshot";

export class JsonResultSnapshotRepository implements ResultSnapshotRepository {
  private readonly repo: ScopedRepository<ResultSnapshot>;

  constructor(filePath: string) {
    this.repo = new ScopedRepository<ResultSnapshot>(new JsonFileStore<ResultSnapshot>(filePath));
  }

  list(scope: Scope): Promise<ResultSnapshot[]> {
    return this.repo.list(scope);
  }

  async listByProposal(scope: Scope, proposalId: string): Promise<ResultSnapshot[]> {
    const all = await this.repo.list(scope);
    return all.filter((snapshot) => snapshot.proposalId === proposalId);
  }

  async listByThread(scope: Scope, proposalThreadId: string): Promise<ResultSnapshot[]> {
    const all = await this.repo.list(scope);
    return all.filter((snapshot) => snapshot.proposalThreadId === proposalThreadId);
  }

  save(snapshot: ResultSnapshot): Promise<void> {
    return this.repo.save(snapshot);
  }
}
