import type { Scope } from "@/shared/scope";
import type { PersonalItemRepository } from "@/modules/personal/application/ports/personal-item-repository";
import type { PersonalItem } from "@/modules/personal/domain/personal-item";

const matches = (item: PersonalItem, scope: Scope, userId: string) =>
  item.clientId === scope.clientId && item.brandId === scope.brandId && item.userId === userId;

/** Test double, and the local fallback when Supabase is not configured (nothing is persisted). */
export class InMemoryPersonalItemRepository implements PersonalItemRepository {
  private items: PersonalItem[] = [];

  async list(scope: Scope, userId: string): Promise<PersonalItem[]> {
    return this.items.filter((item) => matches(item, scope, userId)).map((item) => ({ ...item }));
  }

  async getById(scope: Scope, userId: string, id: string): Promise<PersonalItem | null> {
    const found = this.items.find((item) => item.id === id && matches(item, scope, userId));
    return found ? { ...found } : null;
  }

  async save(item: PersonalItem): Promise<void> {
    const index = this.items.findIndex((existing) => existing.id === item.id);
    if (index >= 0) this.items[index] = { ...item };
    else this.items.push({ ...item });
  }

  async delete(scope: Scope, userId: string, id: string): Promise<void> {
    this.items = this.items.filter((item) => !(item.id === id && matches(item, scope, userId)));
  }
}
