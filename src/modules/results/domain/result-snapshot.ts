export interface ResultMetric {
  name: string;
  value: number | string;
  unit?: string;
}

/**
 * Where the owner says these numbers came from. Every option is a manual
 * entry — there is no live analytics integration in this release, and the
 * UI must never label a snapshot as "synced".
 */
export type ResultSnapshotSource = "manual_owner_entry" | "manual_meta_export" | "manual_other";

/**
 * A manually entered, owner-reported campaign result. There is no live
 * analytics integration in this release — every snapshot's `source` is one
 * of the manual-entry options above.
 */
export interface ResultSnapshot {
  id: string;
  clientId: string;
  brandId: string;
  proposalId: string;
  proposalThreadId: string;
  period: { from: string; to: string };
  metrics: ResultMetric[];
  notes: string;
  source: ResultSnapshotSource;
  recordedBy: string;
  recordedAt: string;
}
