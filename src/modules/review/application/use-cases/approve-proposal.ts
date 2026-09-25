import { err, ok, type Result } from "@/shared/result";
import type { Scope } from "@/shared/scope";
import type { Clock } from "@/shared/application/ports/clock";
import type { IdGenerator } from "@/shared/application/ports/id-generator";
import type { ProposalRepository } from "@/modules/strategy/application/ports/proposal-repository";
import type { ReviewDecisionRepository } from "@/modules/review/application/ports/review-decision-repository";
import type { Proposal } from "@/modules/strategy/domain/proposal";
import type { ReviewDecision } from "@/modules/review/domain/review-decision";
import { approve } from "@/modules/review/domain/proposal-lifecycle";
import type { InvalidTransitionError } from "@/modules/review/domain/proposal-lifecycle";

export interface ApproveProposalInput {
  scope: Scope;
  proposalId: string;
}

export interface ProposalNotFoundError {
  kind: "proposal_not_found";
}

export type ApproveProposalError = ProposalNotFoundError | InvalidTransitionError;

export interface ApproveProposalDependencies {
  proposals: ProposalRepository;
  reviewDecisions: ReviewDecisionRepository;
  clock: Clock;
  ids: IdGenerator;
  /** The single local owner identity (OWNER_NAME env, wired by the container) — approval is never inferred. */
  reviewer: string;
}

/**
 * in_review -> approved. Records the approver, timestamp, and exact
 * version on the proposal itself, plus an auditable ReviewDecision. The
 * caller (UI) is responsible for an explicit confirmation step before
 * invoking this — the app must never infer approval from inactivity.
 */
export function createApproveProposal(deps: ApproveProposalDependencies) {
  return async function approveProposal(input: ApproveProposalInput): Promise<Result<Proposal, ApproveProposalError>> {
    const current = await deps.proposals.getById(input.scope, input.proposalId);
    if (!current) {
      return err({ kind: "proposal_not_found" });
    }

    const now = deps.clock.now();
    const transitioned = approve(current, deps.reviewer, now);
    if (!transitioned.ok) {
      return err(transitioned.error);
    }

    await deps.proposals.save(transitioned.value);

    const decision: ReviewDecision = {
      id: deps.ids.next(),
      clientId: input.scope.clientId,
      brandId: input.scope.brandId,
      proposalId: current.id,
      proposalThreadId: current.proposalThreadId,
      version: current.version,
      decision: "approved",
      reviewer: deps.reviewer,
      feedback: null,
      decidedAt: now,
    };
    await deps.reviewDecisions.save(decision);

    return ok(transitioned.value);
  };
}
