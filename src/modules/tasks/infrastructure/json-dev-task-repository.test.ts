import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { JsonDevTaskRepository } from "./json-dev-task-repository";
import type { DevTask } from "@/modules/tasks/domain/dev-task";

const SCOPE_A = { clientId: "client-1", brandId: "brand-a" };
const SCOPE_B = { clientId: "client-1", brandId: "brand-b" };

function makeTask(overrides: Partial<DevTask> = {}): DevTask {
  return {
    id: "t1",
    clientId: SCOPE_A.clientId,
    brandId: SCOPE_A.brandId,
    title: "Tarea",
    status: "todo",
    priority: "medium",
    assignee: null,
    dueDate: null,
    notes: "",
    createdBy: "Owner",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

async function withRepo(run: (repo: JsonDevTaskRepository) => Promise<void>) {
  const dir = await mkdtemp(path.join(tmpdir(), "dev-tasks-"));
  try {
    await run(new JsonDevTaskRepository(path.join(dir, "dev-tasks.json")));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("tasks persist to the JSON file, are scoped, and delete only within scope", async () => {
  await withRepo(async (repo) => {
    await repo.save(makeTask({ id: "a" }));
    await repo.save(makeTask({ id: "b", brandId: SCOPE_B.brandId }));

    assert.deepEqual((await repo.list(SCOPE_A)).map((t) => t.id), ["a"]);
    assert.equal(await repo.getById(SCOPE_A, "b"), null);

    await repo.delete(SCOPE_A, "b");
    assert.equal((await repo.list(SCOPE_B)).length, 1);

    await repo.delete(SCOPE_A, "a");
    assert.deepEqual(await repo.list(SCOPE_A), []);
  });
});

test("insertIfAbsent never overwrites an existing task", async () => {
  await withRepo(async (repo) => {
    await repo.save(makeTask({ title: "Original" }));

    const inserted = await repo.insertIfAbsent(makeTask({ title: "Distinta" }));

    assert.equal(inserted, false);
    assert.equal((await repo.getById(SCOPE_A, "t1"))?.title, "Original");
  });
});
