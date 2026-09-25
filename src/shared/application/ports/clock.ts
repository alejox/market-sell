/**
 * Time source port. Use cases depend on this instead of `new Date()`
 * directly so tests can supply a fixed clock and assert on exact
 * timestamps.
 */
export interface Clock {
  /** Current instant as an ISO-8601 string. */
  now(): string;
}
