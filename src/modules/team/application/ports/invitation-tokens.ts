export interface InvitationTokens {
  /** A fresh unguessable token to put in the link. */
  generate(): string;
  /** Deterministic hash of a token; the only form that is stored. */
  hash(token: string): string;
}
