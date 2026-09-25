import type { SupabaseClient } from "@supabase/supabase-js";
import { isAllowedOwner } from "./owner-policy";

/**
 * Re-derives the owner id from the request-scoped client's own verified
 * claims rather than trusting a value passed down from the caller. Used by
 * `SupabaseClientRepository.save` to set `clients.owner_id` on insert/update
 * — so a row can never be attributed to anyone but the allow-listed owner,
 * even if a future caller forgets to check `requireOwner()` first.
 *
 * Fails closed (throws) exactly like `isAuthenticatedOwner` does in
 * `owner-auth.ts`: missing/mismatched claims, or a missing
 * `SUPABASE_OWNER_ID`, must never resolve to a usable id.
 */
export async function verifiedOwnerId(supabase: SupabaseClient): Promise<string> {
  const ownerId = process.env.SUPABASE_OWNER_ID;
  const { data, error } = await supabase.auth.getClaims();
  if (error || !isAllowedOwner(data?.claims, ownerId)) {
    throw new Error("Supabase owner verification failed: no verified owner session for this request.");
  }
  return ownerId as string;
}
