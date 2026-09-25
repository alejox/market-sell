import { err, ok, type Result } from "@/shared/result";
import type { Scope } from "@/shared/scope";
import type { Clock } from "@/shared/application/ports/clock";
import type { ProposalRepository } from "@/modules/strategy/application/ports/proposal-repository";
import type { Proposal } from "@/modules/strategy/domain/proposal";
import { archive } from "@/modules/review/domain/proposal-lifecycle";
import type { InvalidTransitionError } from "@/modules/review/domain/proposal-lifecycle";

export interface ArchiveProposalInput {
  scope: Scope;
  proposalId: string;
}

export interface ProposalNotFoundError {
  kind: "proposal_not_found";
}

export type ArchiveProposalError = ProposalNotFoundError | InvalidTransitionError;

export interface ArchiveProposalDependencies {
  proposals: ProposalRepository;
  clock: Clock;
}

/** Any non-archived state -> archived. Archiving is not a review decision — no ReviewDecision is recorded. */
export function createArchiveProposal(deps: ArchiveProposalDependencies) {
  return async function archiveProposal(input: ArchiveProposalInput): Promise<Result<Proposal, ArchiveProposalError>> {
    const current = await deps.proposals.getById(input.scope, input.proposalId);
    if (!current) {
      return err({ kind: "proposal_not_found" });
    }

    const transitioned = archive(current, deps.clock.now());
    if (!transitioned.ok) {
      return err(transitioned.error);
    }

    await deps.proposals.save(transitioned.value);
    return ok(transitioned.value);
  };
}
