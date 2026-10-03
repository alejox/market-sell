export interface VerifiedClaims {
  sub?: unknown;
}

/** Is this verified subject the single allow-listed owner? Authorization is based only on a verified JWT subject. */
export function isAllowedOwner(claims: VerifiedClaims | null | undefined, ownerId: string | undefined): boolean {
  return typeof ownerId === "string" && ownerId.length > 0 && typeof claims?.sub === "string" && claims.sub === ownerId;
}

/**
 * Access to the workspace: the allow-listed owner, or someone who joined
 * through an invitation. `isTeamMember` is the result of a row-level-secured
 * lookup of the verified subject in `team_members` (see the team_invitations
 * migration); it is only consulted when the subject is not the owner.
 */
export function hasWorkspaceAccess(
  claims: VerifiedClaims | null | undefined,
  ownerId: string | undefined,
  isTeamMember: boolean,
): boolean {
  if (typeof claims?.sub !== "string" || claims.sub.length === 0) return false;
  return isAllowedOwner(claims, ownerId) || isTeamMember;
}
