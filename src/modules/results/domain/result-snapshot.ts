export interface ResultMetric {
  metric: string;
  value: number | string;
  unit?: string;
}

/**
 * A manually entered, owner-reported campaign result. There is no live
 * analytics integration in this release — every snapshot is
 * `source: "manual_owner_entry"`.
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
  source: "manual_owner_entry";
  recordedBy: string;
  recordedAt: string;
}
