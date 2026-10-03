import { err, ok, type Result } from "@/shared/result";
import type { SupabaseClientProvider } from "@/shared/infrastructure/supabase/client-provider";
import { unwrapList, unwrapWrite } from "@/shared/infrastructure/supabase/errors";
import type { AcceptInvitationFailure, TeamRepository } from "@/modules/team/application/ports/team-repository";
import type { Invitation, InvitationStatus, TeamMember } from "@/modules/team/domain/team";

/** Row shapes of `public.team_members` / `public.team_invitations` (see the team_invitations migration). */
interface MemberRow {
  client_id: string;
  user_id: string;
  email: string;
  joined_at: string;
}

interface InvitationRow {
  id: string;
  client_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

const FAILURES: AcceptInvitationFailure[] = ["invalid", "used", "expired"];

function failureFrom(message: string | undefined): AcceptInvitationFailure | null {
  const match = FAILURES.find((reason) => message?.includes(`invitation_${reason}`));
  return match ?? null;
}

/**
 * Everything runs as the signed-in user under RLS. Memberships are never
 * written from here: `accept_invitation()` is the only thing that creates
 * one, and no method removes one.
 */
export class SupabaseTeamRepository implements TeamRepository {
  constructor(private readonly getClient: SupabaseClientProvider) {}

  async listMembers(clientId: string): Promise<TeamMember[]> {
    const supabase = await this.getClient();
    const result = await supabase.from("team_members").select("*").eq("client_id", clientId).order("joined_at");
    return unwrapList<MemberRow>("team_members.list", result).map((row) => ({
      clientId: row.client_id,
      userId: row.user_id,
      email: row.email,
      joinedAt: row.joined_at,
    }));
  }

  async listUnusedInvitations(clientId: string): Promise<Invitation[]> {
    const supabase = await this.getClient();
    const result = await supabase
      .from("team_invitations")
      .select("id, client_id, token_hash, created_at, expires_at, used_at")
      .eq("client_id", clientId)
      .is("used_at", null)
      .order("created_at", { ascending: false });
    return unwrapList<InvitationRow>("team_invitations.listUnused", result).map((row) => ({
      id: row.id,
      clientId: row.client_id,
      tokenHash: row.token_hash,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      usedAt: row.used_at,
    }));
  }

  async createInvitation(invitation: Invitation): Promise<void> {
    const supabase = await this.getClient();
    // created_by defaults to auth.uid() and the insert policy requires it to match.
    const result = await supabase.from("team_invitations").insert({
      id: invitation.id,
      client_id: invitation.clientId,
      token_hash: invitation.tokenHash,
      created_at: invitation.createdAt,
      expires_at: invitation.expiresAt,
    });
    unwrapWrite("team_invitations.create", result);
  }

  async cancelInvitation(clientId: string, invitationId: string): Promise<void> {
    const supabase = await this.getClient();
    const result = await supabase
      .from("team_invitations")
      .delete()
      .eq("client_id", clientId)
      .eq("id", invitationId)
      .is("used_at", null);
    unwrapWrite("team_invitations.cancel", result);
  }

  async invitationStatus(tokenHash: string): Promise<InvitationStatus> {
    const supabase = await this.getClient();
    const { data, error } = await supabase.rpc("invitation_status", { p_token_hash: tokenHash });
    if (error) throw new Error(`invitation_status failed: ${error.message}`);
    return data === "valid" || data === "used" || data === "expired" ? data : "invalid";
  }

  async acceptInvitation(tokenHash: string): Promise<Result<{ clientId: string }, AcceptInvitationFailure>> {
    const supabase = await this.getClient();
    const { data, error } = await supabase.rpc("accept_invitation", { p_token_hash: tokenHash });
    if (error) {
      const failure = failureFrom(error.message);
      if (failure) return err(failure);
      throw new Error(`accept_invitation failed: ${error.message}`);
    }
    return ok({ clientId: String(data) });
  }
}
