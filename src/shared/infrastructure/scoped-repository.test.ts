import assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryStore } from "./in-memory-store";
import { ScopedRepository } from "./scoped-repository";

interface Widget {
  id: string;
  clientId: string;
  brandId: string;
  label: string;
}

const SCOPE = { clientId: "client-1", brandId: "brand-a" };

test("insertIfAbsent inserts a new id and returns true", async () => {
  const repo = new ScopedRepository<Widget>(new InMemoryStore<Widget>());

  const inserted = await repo.insertIfAbsent({ id: "w1", ...SCOPE, label: "first" });

  assert.equal(inserted, true);
  assert.deepEqual(await repo.list(SCOPE), [{ id: "w1", ...SCOPE, label: "first" }]);
});

test("insertIfAbsent never overwrites an existing row, even with different content", async () => {
  const repo = new ScopedRepository<Widget>(new InMemoryStore<Widget>());
  await repo.insertIfAbsent({ id: "w1", ...SCOPE, label: "first" });

  const insertedAgain = await repo.insertIfAbsent({ id: "w1", ...SCOPE, label: "clobbered" });

  assert.equal(insertedAgain, false);
  assert.equal((await repo.getById(SCOPE, "w1"))?.label, "first");
});

test("insertIfAbsent is safe when two concurrent calls race for the same id", async () => {
  const repo = new ScopedRepository<Widget>(new InMemoryStore<Widget>());

  const [first, second] = await Promise.all([
    repo.insertIfAbsent({ id: "w1", ...SCOPE, label: "a" }),
    repo.insertIfAbsent({ id: "w1", ...SCOPE, label: "b" }),
  ]);

  assert.equal([first, second].filter(Boolean).length, 1);
  assert.equal((await repo.list(SCOPE)).length, 1);
});
