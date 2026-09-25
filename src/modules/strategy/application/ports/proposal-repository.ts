import type { Scope } from "@/shared/scope";
import type { Proposal } from "@/modules/strategy/domain/proposal";

export interface ProposalRepository {
  list(scope: Scope): Promise<Proposal[]>;
  getById(scope: Scope, proposalId: string): Promise<Proposal | null>;
  /** All versions in one thread (one thread per campaign brief), oldest first is not guaranteed — sort by version. */
  listByThread(scope: Scope, proposalThreadId: string): Promise<Proposal[]>;
  save(proposal: Proposal): Promise<void>;
}
