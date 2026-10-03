import type { Scope } from "@/shared/scope";
import type { PersonalItem } from "@/modules/personal/domain/personal-item";

/**
 * Every method takes the owning `userId` next to the usual scope: an item
 * belonging to another user is never returned, changed or deleted, whatever
 * its id.
 */
export interface PersonalItemRepository {
  list(scope: Scope, userId: string): Promise<PersonalItem[]>;
  getById(scope: Scope, userId: string, id: string): Promise<PersonalItem | null>;
  save(item: PersonalItem): Promise<void>;
  delete(scope: Scope, userId: string, id: string): Promise<void>;
}
