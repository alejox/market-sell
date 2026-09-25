import type { Scope } from "@/shared/scope";
import type { ResultSnapshotRepository } from "@/modules/results/application/ports/result-snapshot-repository";
import type { ResultSnapshot } from "@/modules/results/domain/result-snapshot";

export interface ListResultSnapshotsInput {
  scope: Scope;
  proposalThreadId: string;
}

export interface ListResultSnapshotsDependencies {
  resultSnapshots: ResultSnapshotRepository;
}

/** Every manually entered result for one audience's proposal thread, oldest first. */
export function createListResultSnapshots(deps: ListResultSnapshotsDependencies) {
  return async function listResultSnapshots(input: ListResultSnapshotsInput): Promise<ResultSnapshot[]> {
    const snapshots = await deps.resultSnapshots.listByThread(input.scope, input.proposalThreadId);
    return [...snapshots].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  };
}
