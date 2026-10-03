import { err, ok, type Result } from "@/shared/result";
import type { AcceptInvitationFailure, TeamRepository } from "@/modules/team/application/ports/team-repository";
import { invitationStatus, type Invitation, type InvitationStatus, type TeamMember } from "@/modules/team/domain/team";

/**
 * Test double, and the local fallback when Supabase is not configured:
 * invitations create real accounts, so they only work against Supabase Auth.
 */
export class InMemoryTeamRepository implements TeamRepository {
  private readonly members: TeamMember[] = [];
  private readonly invitations: Invitation[] = [];

  constructor(
    private readonly clock: () => string = () => new Date().toISOString(),
    private readonly currentUser: { userId: string; email: string } = { userId: "local-user", email: "local@example.test" },
  ) {}

  async listMembers(clientId: string): Promise<TeamMember[]> {
    return this.members.filter((member) => member.clientId === clientId);
  }

  async listUnusedInvitations(clientId: string): Promise<Invitation[]> {
    return this.invitations
      .filter((invitation) => invitation.clientId === clientId && invitation.usedAt === null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createInvitation(invitation: Invitation): Promise<void> {
    this.invitations.push({ ...invitation });
  }

  async cancelInvitation(clientId: string, invitationId: string): Promise<void> {
    const index = this.invitations.findIndex(
      (invitation) => invitation.id === invitationId && invitation.clientId === clientId && invitation.usedAt === null,
    );
    if (index >= 0) this.invitations.splice(index, 1);
  }

  async invitationStatus(tokenHash: string): Promise<InvitationStatus> {
    return invitationStatus(this.invitations.find((invitation) => invitation.tokenHash === tokenHash), this.clock());
  }

  async acceptInvitation(tokenHash: string): Promise<Result<{ clientId: string }, AcceptInvitationFailure>> {
    const invitation = this.invitations.find((candidate) => candidate.tokenHash === tokenHash);
    const status = invitationStatus(invitation, this.clock());
    if (!invitation) return err("invalid");
    if (status !== "valid") return err(status);

    invitation.usedAt = this.clock();
    const alreadyMember = this.members.some(
      (member) => member.clientId === invitation.clientId && member.userId === this.currentUser.userId,
    );
    if (!alreadyMember) {
      this.members.push({
        clientId: invitation.clientId,
        userId: this.currentUser.userId,
        email: this.currentUser.email,
        joinedAt: invitation.usedAt,
      });
    }
    return ok({ clientId: invitation.clientId });
  }
}
