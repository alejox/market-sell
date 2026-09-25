import type { CollectionStore } from "./collection-store";
import { upsertById } from "./collection-store";

/**
 * Generic "list / getById / save by id" repository for entities that are
 * not client+brand scoped: Client (no scope at all) and, partially, Brand
 * (scoped by clientId only — see JsonBrandRepository).
 */
export class IdentifiedRepository<T extends { id: string }> {
  constructor(private readonly store: CollectionStore<T>) {}

  async list(): Promise<T[]> {
    return this.store.readAll();
  }

  async getById(id: string): Promise<T | null> {
    const all = await this.store.readAll();
    return all.find((item) => item.id === id) ?? null;
  }

  async save(item: T): Promise<void> {
    await this.store.mutate((items) => upsertById(items, item));
  }

  /**
   * Inserts only when no row with this id exists yet; an existing row is
   * never modified, even to identical content. The existence check and the
   * write happen inside one `mutate` transform, so this is safe against a
   * second concurrent `insertIfAbsent` for the same id within this process
   * (see `JsonFileStore.mutate`'s serialized queue). Returns whether this
   * call actually inserted the row.
   */
  async insertIfAbsent(item: T): Promise<boolean> {
    let inserted = false;
    await this.store.mutate((items) => {
      if (items.some((existing) => existing.id === item.id)) return items;
      inserted = true;
      return [...items, item];
    });
    return inserted;
  }
}
