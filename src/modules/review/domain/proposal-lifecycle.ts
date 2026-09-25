import { err, ok, type Result } from "@/shared/result";
import type { ProposalContent } from "@/modules/strategy/domain/proposal-content.schema";
import type { Proposal, ProposalState } from "@/modules/strategy/domain/proposal";

type TransitionAction = "submit_for_review" | "approve" | "request_changes" | "archive" | "create_revision";

export interface InvalidTransitionError {
  kind: "invalid_transition";
  from: ProposalState;
  action: TransitionAction;
}

export interface FeedbackRequiredError {
  kind: "feedback_required";
}

export type RequestChangesError = InvalidTransitionError | FeedbackRequiredError;

function invalidTransition(from: ProposalState, action: TransitionAction): InvalidTransitionError {
  return { kind: "invalid_transition", from, action };
}

/** draft -> in_review */
export function submitForReview(proposal: Proposal, now: string): Result<Proposal, InvalidTransitionError> {
  if (proposal.state !== "draft") {
    return err(invalidTransition(proposal.state, "submit_for_review"));
  }
  return ok({ ...proposal, state: "in_review", submittedAt: now, updatedAt: now });
}

/** in_review -> approved. Records the reviewer, timestamp, and (unchanged) version. */
export function approve(
  proposal: Proposal,
  reviewer: string,
  now: string,
): Result<Proposal, InvalidTransitionError> {
  if (proposal.state !== "in_review") {
    return err(invalidTransition(proposal.state, "approve"));
  }
  return ok({ ...proposal, state: "approved", approvedAt: now, approvedBy: reviewer, updatedAt: now });
}

/**
 * in_review -> changes_requested. Feedback is mandatory. `reviewer` is not
 * stored on the Proposal itself (unlike `approve`'s `approvedBy`) — the
 * caller records it on the accompanying ReviewDecision, which is the
 * auditable record of who asked for what.
 */
export function requestChanges(
  proposal: Proposal,
  reviewer: string,
  feedback: string,
  now: string,
): Result<Proposal, RequestChangesError> {
  if (proposal.state !== "in_review") {
    return err(invalidTransition(proposal.state, "request_changes"));
  }
  if (feedback.trim().length === 0) {
    return err({ kind: "feedback_required" });
  }
  void reviewer;
  return ok({ ...proposal, state: "changes_requested", updatedAt: now });
}

/** Any non-archived state -> archived. */
export function archive(proposal: Proposal, now: string): Result<Proposal, InvalidTransitionError> {
  if (proposal.state === "archived") {
    return err(invalidTransition(proposal.state, "archive"));
  }
  return ok({ ...proposal, state: "archived", updatedAt: now });
}

/**
 * Creates version n+1 as a new draft in the same thread. Only valid from
 * "changes_requested" or "approved" — never mutates the source proposal,
 * so an approved version stays immutable and intact.
 */
export function createRevision(
  proposal: Proposal,
  newId: string,
  content: ProposalContent,
  sourceReferences: string[],
  now: string,
): Result<Proposal, InvalidTransitionError> {
  if (proposal.state !== "changes_requested" && proposal.state !== "approved") {
    return err(invalidTransition(proposal.state, "create_revision"));
  }
  return ok({
    id: newId,
    clientId: proposal.clientId,
    brandId: proposal.brandId,
    briefId: proposal.briefId,
    proposalThreadId: proposal.proposalThreadId,
    version: proposal.version + 1,
    parentVersion: proposal.version,
    state: "draft",
    content,
    sourceReferences,
    createdAt: now,
    updatedAt: now,
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
  });
}
