/**
 * Generic Result type for domain operations that can fail in an expected,
 * typed way. Domain and application code use this instead of throwing so
 * every caller must handle the failure case explicitly.
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
