/**
 * Storage-agnostic backend for one collection (one JSON file, or one
 * in-memory array). `ScopedRepository`/`IdentifiedRepository` are written
 * against this interface so the same scoping and upsert logic works for
 * both the JSON file adapter and the in-memory test adapter.
 */
export interface CollectionStore<T> {
  readAll(): Promise<T[]>;
  /** Reads, transforms, and writes back as one unit (no interleaved write in between). */
  mutate(transform: (items: T[]) => T[]): Promise<T[]>;
}

export function upsertById<T extends { id: string }>(items: readonly T[], item: T): T[] {
  const index = items.findIndex((existing) => existing.id === item.id);
  if (index === -1) {
    return [...items, item];
  }
  const next = [...items];
  next[index] = item;
  return next;
}
