import { err, ok, type Result } from "@/shared/result";
import type { Scope } from "@/shared/scope";
import type { Clock } from "@/shared/application/ports/clock";
import type { IdGenerator } from "@/shared/application/ports/id-generator";
import type { ProposalRepository } from "@/modules/strategy/application/ports/proposal-repository";
import type { ResultSnapshotRepository } from "@/modules/results/application/ports/result-snapshot-repository";
import type { ResultMetric, ResultSnapshot, ResultSnapshotSource } from "@/modules/results/domain/result-snapshot";

export interface RecordResultSnapshotInput {
  scope: Scope;
  /** Any version in the thread this result belongs to — used only to resolve the thread, not to re-tie the result to one exact version. */
  proposalId: string;
  period: { from: string; to: string };
  metrics: ResultMetric[];
  notes: string;
  source: ResultSnapshotSource;
  recordedBy: string;
}

export interface ProposalNotFoundError {
  kind: "proposal_not_found";
}

export interface RecordResultSnapshotDependencies {
  proposals: ProposalRepository;
  resultSnapshots: ResultSnapshotRepository;
  clock: Clock;
  ids: IdGenerator;
}

/**
 * Records one manually entered campaign result. Never a live analytics
 * sync — `source` is always one of the manual-entry options, and the UI
 * must label it accordingly. Resolves `proposalThreadId` from the given
 * proposal so the result feeds every future generation for this audience,
 * not just the one version it was recorded against.
 */
export function createRecordResultSnapshot(deps: RecordResultSnapshotDependencies) {
  return async function recordResultSnapshot(
    input: RecordResultSnapshotInput,
  ): Promise<Result<ResultSnapshot, ProposalNotFoundError>> {
    const proposal = await deps.proposals.getById(input.scope, input.proposalId);
    if (!proposal) {
      return err({ kind: "proposal_not_found" });
    }

    const snapshot: ResultSnapshot = {
      id: deps.ids.next(),
      clientId: input.scope.clientId,
      brandId: input.scope.brandId,
      proposalId: proposal.id,
      proposalThreadId: proposal.proposalThreadId,
      period: input.period,
      metrics: input.metrics,
      notes: input.notes,
      source: input.source,
      recordedBy: input.recordedBy,
      recordedAt: deps.clock.now(),
    };

    await deps.resultSnapshots.save(snapshot);
    return ok(snapshot);
  };
}
