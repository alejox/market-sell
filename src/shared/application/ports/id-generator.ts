/**
 * Id generation port. Use cases depend on this instead of `randomUUID()`
 * directly so tests can supply deterministic, predictable ids.
 */
export interface IdGenerator {
  next(): string;
}
