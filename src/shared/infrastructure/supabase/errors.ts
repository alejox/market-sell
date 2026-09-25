import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Thrown by every Supabase adapter instead of returning/swallowing a raw
 * PostgREST error. Carries the failing operation's context (e.g.
 * "audiences.getById") plus the original error as `cause` so logs keep the
 * actionable `hint`/`code` fields.
 */
export class SupabaseRepositoryError extends Error {
  constructor(
    context: string,
    public readonly postgrestError: PostgrestError,
  ) {
    super(`${context} failed: ${postgrestError.message} (code ${postgrestError.code || "unknown"})`);
    this.name = "SupabaseRepositoryError";
    this.cause = postgrestError;
  }
}

interface Errorable {
  error: PostgrestError | null;
}

function throwIfError(context: string, result: Errorable): void {
  if (result.error) {
    throw new SupabaseRepositoryError(context, result.error);
  }
}

/** For `.select()` queries expected to return zero or more rows. */
export function unwrapList<T>(context: string, result: { data: T[] | null } & Errorable): T[] {
  throwIfError(context, result);
  return result.data ?? [];
}

/** For `.maybeSingle()` queries: null data with no error means "not found", not a failure. */
export function unwrapMaybe<T>(context: string, result: { data: T | null } & Errorable): T | null {
  throwIfError(context, result);
  return result.data;
}

/** For writes (`insert`/`update`/`upsert`/`delete`) where only success/failure matters. */
export function unwrapWrite(context: string, result: Errorable): void {
  throwIfError(context, result);
}
