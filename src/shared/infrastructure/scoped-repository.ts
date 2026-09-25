import type { Scope } from "@/shared/scope";
import type { CollectionStore } from "./collection-store";
import { upsertById } from "./collection-store";

interface ScopedEntity {
  id: string;
  clientId: string;
  brandId: string;
}

function inScope(item: ScopedEntity, scope: Scope): boolean {
  return item.clientId === scope.clientId && item.brandId === scope.brandId;
}

/**
 * Generic implementation of the "list / getById / save, always scoped by
 * client+brand" shape shared by the Audience, CampaignBrief, Proposal,
 * ReviewDecision, and ResultSnapshot repositories. `getById` re-checks scope
 * on the found record (not just on the query) so a caller can never read
 * another brand's record by guessing or reusing an id — this is what makes
 * cross-scope reads return nothing regardless of backend.
 */
export class ScopedRepository<T extends ScopedEntity> {
  constructor(private readonly store: CollectionStore<T>) {}

  async list(scope: Scope): Promise<T[]> {
    const all = await this.store.readAll();
    return all.filter((item) => inScope(item, scope));
  }

  async getById(scope: Scope, id: string): Promise<T | null> {
    const all = await this.store.readAll();
    const found = all.find((item) => item.id === id);
    return found && inScope(found, scope) ? found : null;
  }

  async save(item: T): Promise<void> {
    await this.store.mutate((items) => upsertById(items, item));
  }

  /**
   * Inserts only when no row with this id exists yet (ids are globally
   * unique, not just unique within a scope — see the workspace schema
   * migration); an existing row is never modified, even to identical
   * content. Safe against a second concurrent `insertIfAbsent` for the same
   * id within this process, for the same reason as
   * `IdentifiedRepository.insertIfAbsent`. Returns whether this call
   * actually inserted the row.
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
