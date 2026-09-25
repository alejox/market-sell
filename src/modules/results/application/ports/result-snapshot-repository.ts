import type { Scope } from "@/shared/scope";
import type { ResultSnapshot } from "@/modules/results/domain/result-snapshot";

export interface ResultSnapshotRepository {
  list(scope: Scope): Promise<ResultSnapshot[]>;
  listByProposal(scope: Scope, proposalId: string): Promise<ResultSnapshot[]>;
  /** Every snapshot recorded against any version in one proposal thread — what generation should learn from. */
  listByThread(scope: Scope, proposalThreadId: string): Promise<ResultSnapshot[]>;
  save(snapshot: ResultSnapshot): Promise<void>;
}
