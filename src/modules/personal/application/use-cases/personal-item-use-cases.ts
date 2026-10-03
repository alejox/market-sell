import { err, ok, type Result } from "@/shared/result";
import type { Scope } from "@/shared/scope";
import type { Clock } from "@/shared/application/ports/clock";
import type { IdGenerator } from "@/shared/application/ports/id-generator";
import type { PersonalItemRepository } from "@/modules/personal/application/ports/personal-item-repository";
import type { PersonalItem, PersonalKind } from "@/modules/personal/domain/personal-item";

export interface PersonalDependencies {
  items: PersonalItemRepository;
  clock: Clock;
  ids: IdGenerator;
}

export type PersonalError = { kind: "title_required" } | { kind: "item_not_found" };

export interface CreatePersonalItemInput {
  scope: Scope;
  userId: string;
  kind: PersonalKind;
  title: string;
  body?: string;
}

export function createCreatePersonalItem(deps: PersonalDependencies) {
  return async function createPersonalItem(
    input: CreatePersonalItemInput,
  ): Promise<Result<PersonalItem, { kind: "title_required" }>> {
    const title = input.title.trim();
    if (title.length === 0) return err({ kind: "title_required" });

    const now = deps.clock.now();
    const item: PersonalItem = {
      id: deps.ids.next(),
      clientId: input.scope.clientId,
      brandId: input.scope.brandId,
      userId: input.userId,
      kind: input.kind,
      title,
      body: input.body ?? "",
      done: false,
      createdAt: now,
      updatedAt: now,
    };
    await deps.items.save(item);
    return ok(item);
  };
}

/** `undefined` leaves a field unchanged. */
export interface PersonalItemPatch {
  title?: string;
  kind?: PersonalKind;
  body?: string;
  done?: boolean;
}

export interface UpdatePersonalItemInput {
  scope: Scope;
  userId: string;
  itemId: string;
  patch: PersonalItemPatch;
}

export function createUpdatePersonalItem(deps: Pick<PersonalDependencies, "items" | "clock">) {
  return async function updatePersonalItem(input: UpdatePersonalItemInput): Promise<Result<PersonalItem, PersonalError>> {
    const current = await deps.items.getById(input.scope, input.userId, input.itemId);
    if (!current) return err({ kind: "item_not_found" });

    const title = input.patch.title === undefined ? current.title : input.patch.title.trim();
    if (title.length === 0) return err({ kind: "title_required" });

    const kind = input.patch.kind ?? current.kind;
    const updated: PersonalItem = {
      ...current,
      title,
      kind,
      body: input.patch.body ?? current.body,
      // A note is never "done"; switching a finished task to a note clears it.
      done: kind === "note" ? false : (input.patch.done ?? current.done),
      updatedAt: deps.clock.now(),
    };
    await deps.items.save(updated);
    return ok(updated);
  };
}

export interface DeletePersonalItemInput {
  scope: Scope;
  userId: string;
  itemId: string;
}

export function createDeletePersonalItem(deps: Pick<PersonalDependencies, "items">) {
  return async function deletePersonalItem(input: DeletePersonalItemInput): Promise<Result<void, { kind: "item_not_found" }>> {
    const current = await deps.items.getById(input.scope, input.userId, input.itemId);
    if (!current) return err({ kind: "item_not_found" });
    await deps.items.delete(input.scope, input.userId, input.itemId);
    return ok(undefined);
  };
}
