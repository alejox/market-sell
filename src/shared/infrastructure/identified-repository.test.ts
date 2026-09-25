import assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryStore } from "./in-memory-store";
import { IdentifiedRepository } from "./identified-repository";

interface Widget {
  id: string;
  label: string;
}

test("insertIfAbsent inserts a new id and returns true", async () => {
  const repo = new IdentifiedRepository<Widget>(new InMemoryStore<Widget>());

  const inserted = await repo.insertIfAbsent({ id: "w1", label: "first" });

  assert.equal(inserted, true);
  assert.deepEqual(await repo.list(), [{ id: "w1", label: "first" }]);
});

test("insertIfAbsent never overwrites an existing row, even with different content", async () => {
  const repo = new IdentifiedRepository<Widget>(new InMemoryStore<Widget>());
  await repo.insertIfAbsent({ id: "w1", label: "first" });

  const insertedAgain = await repo.insertIfAbsent({ id: "w1", label: "clobbered" });

  assert.equal(insertedAgain, false);
  assert.deepEqual(await repo.getById("w1"), { id: "w1", label: "first" });
});

test("insertIfAbsent is safe when two concurrent calls race for the same id", async () => {
  const repo = new IdentifiedRepository<Widget>(new InMemoryStore<Widget>());

  const [first, second] = await Promise.all([
    repo.insertIfAbsent({ id: "w1", label: "a" }),
    repo.insertIfAbsent({ id: "w1", label: "b" }),
  ]);

  // Exactly one of the two racing calls inserted; the other was a no-op.
  assert.equal([first, second].filter(Boolean).length, 1);
  assert.equal((await repo.list()).length, 1);
});
