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
}
