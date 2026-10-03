import type { Result } from "@/shared/result";
import type { Invitation, InvitationStatus, TeamMember } from "@/modules/team/domain/team";

export type AcceptInvitationFailure = "invalid" | "used" | "expired";

/**
 * Team data is scoped by client only: membership belongs to the client, not
 * to one of its brands. There is intentionally no method that removes a
 * member.
 */
export interface TeamRepository {
  listMembers(clientId: string): Promise<TeamMember[]>;
  /** Invitations that have not been used, newest first (expired ones included; callers filter by the clock). */
  listUnusedInvitations(clientId: string): Promise<Invitation[]>;
  createInvitation(invitation: Invitation): Promise<void>;
  /** Cancels an unused invitation. A used invitation is never touched. */
  cancelInvitation(clientId: string, invitationId: string): Promise<void>;
  /** Callable before sign-in: only says whether the token would work right now. */
  invitationStatus(tokenHash: string): Promise<InvitationStatus>;
  /** Consumes the invitation for the signed-in user and returns the client they joined. */
  acceptInvitation(tokenHash: string): Promise<Result<{ clientId: string }, AcceptInvitationFailure>>;
}
