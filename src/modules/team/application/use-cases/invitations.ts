import type { Result } from "@/shared/result";
import type { Clock } from "@/shared/application/ports/clock";
import type { IdGenerator } from "@/shared/application/ports/id-generator";
import type { InvitationTokens } from "@/modules/team/application/ports/invitation-tokens";
import type { AcceptInvitationFailure, TeamRepository } from "@/modules/team/application/ports/team-repository";
import {
  invitationExpiry,
  isPending,
  type Invitation,
  type InvitationStatus,
  type TeamMember,
} from "@/modules/team/domain/team";

export interface TeamDependencies {
  team: TeamRepository;
  tokens: InvitationTokens;
  clock: Clock;
  ids: IdGenerator;
}

export interface CreatedInvitation {
  invitationId: string;
  /** The raw token. Shown once to the person creating the link; never stored. */
  token: string;
  expiresAt: string;
}

export function createCreateInvitation(deps: TeamDependencies) {
  return async function createInvitation(input: { clientId: string }): Promise<CreatedInvitation> {
    const token = deps.tokens.generate();
    const createdAt = deps.clock.now();
    const invitation: Invitation = {
      id: deps.ids.next(),
      clientId: input.clientId,
      tokenHash: deps.tokens.hash(token),
      createdAt,
      expiresAt: invitationExpiry(createdAt),
      usedAt: null,
    };
    await deps.team.createInvitation(invitation);
    return { invitationId: invitation.id, token, expiresAt: invitation.expiresAt };
  };
}

export interface TeamOverview {
  members: TeamMember[];
  pending: Invitation[];
}

export function createListTeam(deps: Pick<TeamDependencies, "team" | "clock">) {
  return async function listTeam(input: { clientId: string }): Promise<TeamOverview> {
    const [members, unused] = await Promise.all([
      deps.team.listMembers(input.clientId),
      deps.team.listUnusedInvitations(input.clientId),
    ]);
    const now = deps.clock.now();
    return { members, pending: unused.filter((invitation) => isPending(invitation, now)) };
  };
}

export function createCancelInvitation(deps: Pick<TeamDependencies, "team">) {
  return async function cancelInvitation(input: { clientId: string; invitationId: string }): Promise<void> {
    await deps.team.cancelInvitation(input.clientId, input.invitationId);
  };
}

export function createCheckInvitation(deps: Pick<TeamDependencies, "team" | "tokens">) {
  return async function checkInvitation(input: { token: string }): Promise<InvitationStatus> {
    return deps.team.invitationStatus(deps.tokens.hash(input.token));
  };
}

export function createAcceptInvitation(deps: Pick<TeamDependencies, "team" | "tokens">) {
  return async function acceptInvitation(input: {
    token: string;
  }): Promise<Result<{ clientId: string }, AcceptInvitationFailure>> {
    return deps.team.acceptInvitation(deps.tokens.hash(input.token));
  };
}
