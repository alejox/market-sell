import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCreatePersonalItem,
  createDeletePersonalItem,
  createUpdatePersonalItem,
} from "./personal-item-use-cases";
import { InMemoryPersonalItemRepository } from "@/modules/personal/infrastructure/in-memory-personal-item-repository";

const SCOPE = { clientId: "client-1", brandId: "brand-1" };
const OTHER_BRAND = { clientId: "client-1", brandId: "brand-2" };
const ANA = "user-ana";
const LUIS = "user-luis";

class SteppingClock {
  private tick = 0;
  now(): string {
    this.tick += 1;
    return `2026-10-0${this.tick}T00:00:00.000Z`;
  }
}
class SequentialIds {
  private count = 0;
  next(): string {
    this.count += 1;
    return `item-${this.count}`;
  }
}

function setup() {
  const items = new InMemoryPersonalItemRepository();
  const clock = new SteppingClock();
  return {
    items,
    create: createCreatePersonalItem({ items, clock, ids: new SequentialIds() }),
    update: createUpdatePersonalItem({ items, clock }),
    remove: createDeletePersonalItem({ items }),
  };
}

test("everyone starts with nothing", async () => {
  const { items } = setup();
  assert.deepEqual(await items.list(SCOPE, ANA), []);
});

test("create saves a private, scoped item with a trimmed title", async () => {
  const { items, create } = setup();

  const result = await create({ scope: SCOPE, userId: ANA, kind: "task", title: "  Llamar a Pedro  " });

  assert.equal(result.ok, true);
  const [saved] = await items.list(SCOPE, ANA);
  assert.equal(saved.title, "Llamar a Pedro");
  assert.equal(saved.userId, ANA);
  assert.equal(saved.done, false);
  assert.equal(saved.clientId, "client-1");
  assert.equal(saved.brandId, "brand-1");
});

test("create rejects an empty title", async () => {
  const { items, create } = setup();
  assert.deepEqual(await create({ scope: SCOPE, userId: ANA, kind: "note", title: "   " }), {
    ok: false,
    error: { kind: "title_required" },
  });
  assert.deepEqual(await items.list(SCOPE, ANA), []);
});

test("one user never sees, edits or deletes another user's items", async () => {
  const { items, create, update, remove } = setup();
  const created = await create({ scope: SCOPE, userId: ANA, kind: "note", title: "Privado", body: "secreto" });
  assert.ok(created.ok);
  const id = created.value.id;

  assert.deepEqual(await items.list(SCOPE, LUIS), []);
  assert.equal(await items.getById(SCOPE, LUIS, id), null);
  assert.deepEqual(await update({ scope: SCOPE, userId: LUIS, itemId: id, patch: { title: "Hackeado" } }), {
    ok: false,
    error: { kind: "item_not_found" },
  });
  assert.deepEqual(await remove({ scope: SCOPE, userId: LUIS, itemId: id }), { ok: false, error: { kind: "item_not_found" } });
  assert.equal((await items.getById(SCOPE, ANA, id))?.title, "Privado");
});

test("items are scoped by brand too", async () => {
  const { items, create } = setup();
  await create({ scope: SCOPE, userId: ANA, kind: "task", title: "Solo en la marca 1" });
  assert.deepEqual(await items.list(OTHER_BRAND, ANA), []);
});

test("update marks a task done and keeps untouched fields", async () => {
  const { items, create, update } = setup();
  const created = await create({ scope: SCOPE, userId: ANA, kind: "task", title: "Enviar factura", body: "- [ ] paso" });
  assert.ok(created.ok);

  const result = await update({ scope: SCOPE, userId: ANA, itemId: created.value.id, patch: { done: true } });

  assert.ok(result.ok);
  const saved = await items.getById(SCOPE, ANA, created.value.id);
  assert.equal(saved?.done, true);
  assert.equal(saved?.title, "Enviar factura");
  assert.equal(saved?.body, "- [ ] paso");
  assert.ok((saved?.updatedAt ?? "") > (saved?.createdAt ?? ""));
});

test("turning a finished task into a note clears done, and a note cannot be marked done", async () => {
  const { items, create, update } = setup();
  const created = await create({ scope: SCOPE, userId: ANA, kind: "task", title: "X" });
  assert.ok(created.ok);
  await update({ scope: SCOPE, userId: ANA, itemId: created.value.id, patch: { done: true } });

  await update({ scope: SCOPE, userId: ANA, itemId: created.value.id, patch: { kind: "note" } });
  assert.equal((await items.getById(SCOPE, ANA, created.value.id))?.done, false);

  await update({ scope: SCOPE, userId: ANA, itemId: created.value.id, patch: { done: true } });
  assert.equal((await items.getById(SCOPE, ANA, created.value.id))?.done, false);
});

test("update rejects a blank title and delete removes the item", async () => {
  const { items, create, update, remove } = setup();
  const created = await create({ scope: SCOPE, userId: ANA, kind: "note", title: "Nota" });
  assert.ok(created.ok);

  assert.deepEqual(await update({ scope: SCOPE, userId: ANA, itemId: created.value.id, patch: { title: " " } }), {
    ok: false,
    error: { kind: "title_required" },
  });
  assert.deepEqual(await remove({ scope: SCOPE, userId: ANA, itemId: created.value.id }), { ok: true, value: undefined });
  assert.deepEqual(await items.list(SCOPE, ANA), []);
});
