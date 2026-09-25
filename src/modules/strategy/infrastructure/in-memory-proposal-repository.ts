import { ScopedRepository } from "@/shared/infrastructure/scoped-repository";
import { InMemoryStore } from "@/shared/infrastructure/in-memory-store";
import type { Scope } from "@/shared/scope";
import type { ProposalRepository } from "@/modules/strategy/application/ports/proposal-repository";
import type { Proposal } from "@/modules/strategy/domain/proposal";

export class InMemoryProposalRepository implements ProposalRepository {
  private readonly repo = new ScopedRepository<Proposal>(new InMemoryStore<Proposal>());

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

  insertIfAbsent(proposal: Proposal): Promise<boolean> {
    return this.repo.insertIfAbsent(proposal);
  }
}
