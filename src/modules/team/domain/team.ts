/**
 * Team access for a client. Everyone who joins through an invitation is an
 * admin with the same access as the owner; there is no role and, by design,
 * no way to remove a member.
 */

export const INVITATION_TTL_DAYS = 7;

export interface TeamMember {
  clientId: string;
  userId: string;
  email: string;
  joinedAt: string;
}

/** A single-use link. Only the hash of its token is ever stored. */
export interface Invitation {
  id: string;
  clientId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
}

export type InvitationStatus = "valid" | "used" | "expired" | "invalid";

export function invitationExpiry(createdAtIso: string): string {
  const expires = new Date(createdAtIso);
  expires.setUTCDate(expires.getUTCDate() + INVITATION_TTL_DAYS);
  return expires.toISOString();
}

/** `invalid` means no invitation matches the token at all. `now` is passed in, never read from a clock. */
export function invitationStatus(invitation: Invitation | null | undefined, nowIso: string): InvitationStatus {
  if (!invitation) return "invalid";
  if (invitation.usedAt !== null) return "used";
  if (invitation.expiresAt <= nowIso) return "expired";
  return "valid";
}

export function isPending(invitation: Invitation, nowIso: string): boolean {
  return invitationStatus(invitation, nowIso) === "valid";
}
