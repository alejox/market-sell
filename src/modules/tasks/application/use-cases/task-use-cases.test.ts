import assert from "node:assert/strict";
import { test } from "node:test";
import { createCreateTask } from "./create-task";
import { createUpdateTask } from "./update-task";
import { createDeleteTask } from "./delete-task";
import { InMemoryDevTaskRepository } from "@/modules/tasks/infrastructure/in-memory-dev-task-repository";

const SCOPE = { clientId: "client-1", brandId: "brand-1" };
const OTHER_SCOPE = { clientId: "client-1", brandId: "brand-2" };

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
    return `task-${this.count}`;
  }
}

function setup() {
  const tasks = new InMemoryDevTaskRepository();
  const clock = new SteppingClock();
  const createTask = createCreateTask({ tasks, clock, ids: new SequentialIds() });
  const updateTask = createUpdateTask({ tasks, clock });
  const deleteTask = createDeleteTask({ tasks });
  return { tasks, createTask, updateTask, deleteTask };
}

test("createTask saves a scoped task with defaults and a normalized title/assignee", async () => {
  const { tasks, createTask } = setup();

  const result = await createTask({ scope: SCOPE, title: "  Migrar base  ", assignee: "  Ana  ", createdBy: "Owner" });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.title, "Migrar base");
  assert.equal(result.value.assignee, "Ana");
  assert.equal(result.value.status, "todo");
  assert.equal(result.value.priority, "medium");
  assert.equal(result.value.dueDate, null);
  assert.equal(result.value.clientId, SCOPE.clientId);
  assert.equal(result.value.brandId, SCOPE.brandId);
  assert.deepEqual(await tasks.list(SCOPE), [result.value]);
  assert.deepEqual(await tasks.list(OTHER_SCOPE), []);
});

test("createTask rejects a blank title and an invalid deadline without saving", async () => {
  const { tasks, createTask } = setup();

  const blank = await createTask({ scope: SCOPE, title: "   ", createdBy: "Owner" });
  const badDate = await createTask({ scope: SCOPE, title: "x", dueDate: "2026-02-31", createdBy: "Owner" });

  assert.deepEqual(blank, { ok: false, error: { kind: "title_required" } });
  assert.deepEqual(badDate, { ok: false, error: { kind: "invalid_due_date" } });
  assert.deepEqual(await tasks.list(SCOPE), []);
});

test("updateTask moves a task between columns, reassigns it and keeps unrelated fields", async () => {
  const { createTask, updateTask } = setup();
  const created = await createTask({ scope: SCOPE, title: "Login", assignee: "Ana", dueDate: "2026-10-10", createdBy: "Owner" });
  assert.ok(created.ok);

  const moved = await updateTask({ scope: SCOPE, taskId: created.value.id, patch: { status: "in_progress", assignee: "Luis" } });

  assert.ok(moved.ok);
  assert.equal(moved.value.status, "in_progress");
  assert.equal(moved.value.assignee, "Luis");
  assert.equal(moved.value.dueDate, "2026-10-10");
  assert.equal(moved.value.title, "Login");
  assert.notEqual(moved.value.updatedAt, created.value.updatedAt);
  assert.equal(moved.value.createdAt, created.value.createdAt);
});

test("updateTask: null clears the assignee and deadline, undefined leaves them", async () => {
  const { createTask, updateTask } = setup();
  const created = await createTask({ scope: SCOPE, title: "Login", assignee: "Ana", dueDate: "2026-10-10", createdBy: "Owner" });
  assert.ok(created.ok);

  const kept = await updateTask({ scope: SCOPE, taskId: created.value.id, patch: { notes: "# Plan" } });
  assert.ok(kept.ok);
  assert.equal(kept.value.assignee, "Ana");
  assert.equal(kept.value.notes, "# Plan");

  const cleared = await updateTask({ scope: SCOPE, taskId: created.value.id, patch: { assignee: null, dueDate: "" } });
  assert.ok(cleared.ok);
  assert.equal(cleared.value.assignee, null);
  assert.equal(cleared.value.dueDate, null);
});

test("updateTask rejects an empty title / bad date and never persists a partial change", async () => {
  const { tasks, createTask, updateTask } = setup();
  const created = await createTask({ scope: SCOPE, title: "Login", createdBy: "Owner" });
  assert.ok(created.ok);

  const noTitle = await updateTask({ scope: SCOPE, taskId: created.value.id, patch: { status: "done", title: " " } });
  const badDate = await updateTask({ scope: SCOPE, taskId: created.value.id, patch: { status: "done", dueDate: "nope" } });

  assert.deepEqual(noTitle, { ok: false, error: { kind: "title_required" } });
  assert.deepEqual(badDate, { ok: false, error: { kind: "invalid_due_date" } });
  assert.equal((await tasks.getById(SCOPE, created.value.id))?.status, "todo");
});

test("a task id from another brand resolves to task_not_found for update and delete, and survives", async () => {
  const { tasks, createTask, updateTask, deleteTask } = setup();
  const created = await createTask({ scope: SCOPE, title: "Privada", createdBy: "Owner" });
  assert.ok(created.ok);

  const updated = await updateTask({ scope: OTHER_SCOPE, taskId: created.value.id, patch: { status: "done" } });
  const deleted = await deleteTask({ scope: OTHER_SCOPE, taskId: created.value.id });

  assert.deepEqual(updated, { ok: false, error: { kind: "task_not_found" } });
  assert.deepEqual(deleted, { ok: false, error: { kind: "task_not_found" } });
  assert.equal((await tasks.getById(SCOPE, created.value.id))?.status, "todo");
});

test("deleteTask removes only the targeted task", async () => {
  const { tasks, createTask, deleteTask } = setup();
  const a = await createTask({ scope: SCOPE, title: "A", createdBy: "Owner" });
  const b = await createTask({ scope: SCOPE, title: "B", createdBy: "Owner" });
  assert.ok(a.ok && b.ok);

  const result = await deleteTask({ scope: SCOPE, taskId: a.value.id });

  assert.equal(result.ok, true);
  assert.deepEqual((await tasks.list(SCOPE)).map((t) => t.id), [b.value.id]);
});
