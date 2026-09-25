import { err, ok, type Result } from "@/shared/result";
import type { Scope } from "@/shared/scope";
import type { Clock } from "@/shared/application/ports/clock";
import type { ProposalRepository } from "@/modules/strategy/application/ports/proposal-repository";
import type { Proposal } from "@/modules/strategy/domain/proposal";
import { submitForReview as submitForReviewTransition } from "@/modules/review/domain/proposal-lifecycle";
import type { InvalidTransitionError } from "@/modules/review/domain/proposal-lifecycle";

export interface SubmitForReviewInput {
  scope: Scope;
  proposalId: string;
}

export interface ProposalNotFoundError {
  kind: "proposal_not_found";
}

export type SubmitForReviewError = ProposalNotFoundError | InvalidTransitionError;

export interface SubmitForReviewDependencies {
  proposals: ProposalRepository;
  clock: Clock;
}

/** draft -> in_review. The owner explicitly opens a draft for review. */
export function createSubmitForReview(deps: SubmitForReviewDependencies) {
  return async function submitForReview(input: SubmitForReviewInput): Promise<Result<Proposal, SubmitForReviewError>> {
    const current = await deps.proposals.getById(input.scope, input.proposalId);
    if (!current) {
      return err({ kind: "proposal_not_found" });
    }

    const transitioned = submitForReviewTransition(current, deps.clock.now());
    if (!transitioned.ok) {
      return err(transitioned.error);
    }

    await deps.proposals.save(transitioned.value);
    return ok(transitioned.value);
  };
}
