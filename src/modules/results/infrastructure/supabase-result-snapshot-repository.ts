import type { ResultSnapshotRepository } from "@/modules/results/application/ports/result-snapshot-repository";
import type { ResultMetric, ResultSnapshot, ResultSnapshotSource } from "@/modules/results/domain/result-snapshot";
import type { Scope } from "@/shared/scope";
import type { SupabaseClientProvider } from "@/shared/infrastructure/supabase/client-provider";
import { ScopedSupabaseRepository } from "@/shared/infrastructure/supabase/scoped-supabase-repository";

const TABLE = "result_snapshots";

/** Row shape of `public.result_snapshots` (see the workspace schema migration). */
interface ResultSnapshotRow {
  id: string;
  client_id: string;
  brand_id: string;
  proposal_id: string;
  proposal_thread_id: string;
  period: { from: string; to: string };
  metrics: ResultMetric[];
  notes: string;
  source: ResultSnapshotSource;
  recorded_by: string;
  recorded_at: string;
}

function fromRow(row: ResultSnapshotRow): ResultSnapshot {
  return {
    id: row.id,
    clientId: row.client_id,
    brandId: row.brand_id,
    proposalId: row.proposal_id,
    proposalThreadId: row.proposal_thread_id,
    period: row.period,
    metrics: row.metrics,
    notes: row.notes,
    source: row.source,
    recordedBy: row.recorded_by,
    recordedAt: row.recorded_at,
  };
}

function toRow(snapshot: ResultSnapshot): ResultSnapshotRow {
  return {
    id: snapshot.id,
    client_id: snapshot.clientId,
    brand_id: snapshot.brandId,
    proposal_id: snapshot.proposalId,
    proposal_thread_id: snapshot.proposalThreadId,
    period: snapshot.period,
    metrics: snapshot.metrics,
    notes: snapshot.notes,
    source: snapshot.source,
    recorded_by: snapshot.recordedBy,
    recorded_at: snapshot.recordedAt,
  };
}

export class SupabaseResultSnapshotRepository implements ResultSnapshotRepository {
  private readonly repo: ScopedSupabaseRepository<ResultSnapshotRow, ResultSnapshot>;

  constructor(getClient: SupabaseClientProvider) {
    this.repo = new ScopedSupabaseRepository<ResultSnapshotRow, ResultSnapshot>(getClient, TABLE, fromRow, toRow);
  }

  list(scope: Scope): Promise<ResultSnapshot[]> {
    return this.repo.list(scope);
  }

  listByProposal(scope: Scope, proposalId: string): Promise<ResultSnapshot[]> {
    return this.repo.listBy(scope, "proposal_id", proposalId);
  }

  listByThread(scope: Scope, proposalThreadId: string): Promise<ResultSnapshot[]> {
    return this.repo.listBy(scope, "proposal_thread_id", proposalThreadId);
  }

  save(snapshot: ResultSnapshot): Promise<void> {
    return this.repo.save(snapshot);
  }
}
