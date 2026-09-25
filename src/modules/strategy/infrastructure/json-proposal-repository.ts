import { ScopedRepository } from "@/shared/infrastructure/scoped-repository";
import { JsonFileStore } from "@/shared/infrastructure/json-file-store";
import type { Scope } from "@/shared/scope";
import type { ProposalRepository } from "@/modules/strategy/application/ports/proposal-repository";
import type { Proposal } from "@/modules/strategy/domain/proposal";

export class JsonProposalRepository implements ProposalRepository {
  private readonly repo: ScopedRepository<Proposal>;

  constructor(filePath: string) {
    this.repo = new ScopedRepository<Proposal>(new JsonFileStore<Proposal>(filePath));
  }

  list(scope: Scope): Promise<Proposal[]> {
    return this.repo.list(scope);
  }

  getById(scope: Scope, proposalId: string): Promise<Proposal | null> {
    return this.repo.getById(scope, proposalId);
  }

  async listByThread(scope: Scope, proposalThreadId: string): Promise<Proposal[]> {
    const all = await this.repo.list(scope);
    return all.filter((proposal) => proposal.proposalThreadId === proposalThreadId);
  }

  save(proposal: Proposal): Promise<void> {
    return this.repo.save(proposal);
  }
}
