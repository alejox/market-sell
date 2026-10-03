import { createHash, randomBytes } from "node:crypto";
import type { InvitationTokens } from "@/modules/team/application/ports/invitation-tokens";

/** 256 random bits, URL-safe; the stored form is its SHA-256 hex digest. */
export class NodeInvitationTokens implements InvitationTokens {
  generate(): string {
    return randomBytes(32).toString("base64url");
  }

  hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
