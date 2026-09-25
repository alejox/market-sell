export type ReviewDecisionKind = "approved" | "changes_requested";

/**
 * The audit record of one review decision against one proposal version.
 * Written alongside (never instead of) the proposal state transition, and
 * never overwritten.
 */
export interface ReviewDecision {
  id: string;
  clientId: string;
  brandId: string;
  proposalId: string;
  proposalThreadId: string;
  version: number;
  decision: ReviewDecisionKind;
  reviewer: string;
  /** Required for "changes_requested"; optional otherwise. */
  feedback: string | null;
  decidedAt: string;
}
