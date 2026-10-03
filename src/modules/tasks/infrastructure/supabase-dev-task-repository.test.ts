import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FakeSupabaseClient } from "@/shared/infrastructure/supabase/fake-supabase-client";
import { SupabaseDevTaskRepository } from "./supabase-dev-task-repository";
import type { DevTask } from "@/modules/tasks/domain/dev-task";

const SCOPE_A = { clientId: "client-1", brandId: "brand-a" };
const SCOPE_B = { clientId: "client-1", brandId: "brand-b" };

function makeTask(overrides: Partial<DevTask> = {}): DevTask {
  return {
    id: "t1",
    clientId: SCOPE_A.clientId,
    brandId: SCOPE_A.brandId,
    title: "Tarea",
    status: "in_review",
    priority: "high",
    assigneeId: "11111111-1111-1111-1111-111111111111",
    dueDate: "2026-10-10",
    notes: "# Notas",
    createdBy: "Owner",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-02T00:00:00.000Z",
    ...overrides,
  };
}

function makeRepo(fake: FakeSupabaseClient) {
  return new SupabaseDevTaskRepository(async () => fake as unknown as SupabaseClient);
}

test("save maps the task to the snake_case dev_tasks row and reads it back unchanged", async () => {
  const fake = new FakeSupabaseClient();
  const repo = makeRepo(fake);
  const task = makeTask();

  await repo.save(task);

  assert.deepEqual(fake.rowsOf("dev_tasks"), [
    {
      id: "t1",
      client_id: "client-1",
      brand_id: "brand-a",
      title: "Tarea",
      status: "in_review",
      priority: "high",
      assignee_id: "11111111-1111-1111-1111-111111111111",
      due_date: "2026-10-10",
      notes: "# Notas",
      created_by: "Owner",
      created_at: "2026-10-01T00:00:00.000Z",
      updated_at: "2026-10-02T00:00:00.000Z",
    },
  ]);
  assert.deepEqual(await repo.getById(SCOPE_A, "t1"), task);
});

test("an unassigned task with no deadline round-trips its nulls", async () => {
  const fake = new FakeSupabaseClient();
  const repo = makeRepo(fake);
  const task = makeTask({ assigneeId: null, dueDate: null });

  await repo.save(task);

  assert.deepEqual(await repo.list(SCOPE_A), [task]);
});

test("list and getById never return another brand's task, even for the same id", async () => {
  const fake = new FakeSupabaseClient();
  const repo = makeRepo(fake);
  await repo.save(makeTask({ id: "same", title: "De A" }));
  await repo.save(makeTask({ id: "other", brandId: SCOPE_B.brandId, title: "De B" }));

  assert.deepEqual((await repo.list(SCOPE_A)).map((t) => t.title), ["De A"]);
  assert.equal(await repo.getById(SCOPE_B, "same"), null);
});

test("delete removes the task in scope and ignores the same id in another scope", async () => {
  const fake = new FakeSupabaseClient();
  const repo = makeRepo(fake);
  await repo.save(makeTask({ id: "t1" }));

  await repo.delete(SCOPE_B, "t1");
  assert.equal((await repo.list(SCOPE_A)).length, 1);

  await repo.delete(SCOPE_A, "t1");
  assert.deepEqual(await repo.list(SCOPE_A), []);
});

test("a failing delete is thrown with operation context", async () => {
  const fake = new FakeSupabaseClient();
  const repo = makeRepo(fake);
  await repo.save(makeTask());
  fake.failWritesOn("dev_tasks");

  await assert.rejects(() => repo.delete(SCOPE_A, "t1"), /dev_tasks\.delete failed/);
});
