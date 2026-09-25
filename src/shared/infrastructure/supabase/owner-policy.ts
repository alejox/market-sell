export interface VerifiedClaims {
  sub?: unknown;
}

/** Authorization is based only on a verified JWT subject and a server-only allow-list. */
export function isAllowedOwner(claims: VerifiedClaims | null | undefined, ownerId: string | undefined): boolean {
  return typeof ownerId === "string" && ownerId.length > 0 && typeof claims?.sub === "string" && claims.sub === ownerId;
}
