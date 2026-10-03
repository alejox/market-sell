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

const MEMBERS = new Set(["client-1:u-ana", "client-1:u-luis"]);
const assignees = { isMember: async (clientId: string, userId: string) => MEMBERS.has(`${clientId}:${userId}`) };

function setup() {
  const tasks = new InMemoryDevTaskRepository();
  const clock = new SteppingClock();
  const createTask = createCreateTask({ tasks, assignees, clock, ids: new SequentialIds() });
  const updateTask = createUpdateTask({ tasks, assignees, clock });
  const deleteTask = createDeleteTask({ tasks });
  return { tasks, createTask, updateTask, deleteTask };
}

test("createTask saves a scoped task with defaults and a normalized title and a member as assignee", async () => {
  const { tasks, createTask } = setup();

  const result = await createTask({ scope: SCOPE, title: "  Migrar base  ", assigneeId: "  u-ana  ", createdBy: "Owner" });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.title, "Migrar base");
  assert.equal(result.value.assigneeId, "u-ana");
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
  const created = await createTask({ scope: SCOPE, title: "Login", assigneeId: "u-ana", dueDate: "2026-10-10", createdBy: "Owner" });
  assert.ok(created.ok);

  const moved = await updateTask({ scope: SCOPE, taskId: created.value.id, patch: { status: "in_progress", assigneeId: "u-luis" } });

  assert.ok(moved.ok);
  assert.equal(moved.value.status, "in_progress");
  assert.equal(moved.value.assigneeId, "u-luis");
  assert.equal(moved.value.dueDate, "2026-10-10");
  assert.equal(moved.value.title, "Login");
  assert.notEqual(moved.value.updatedAt, created.value.updatedAt);
  assert.equal(moved.value.createdAt, created.value.createdAt);
});

test("updateTask: null clears the assignee and deadline, undefined leaves them", async () => {
  const { createTask, updateTask } = setup();
  const created = await createTask({ scope: SCOPE, title: "Login", assigneeId: "u-ana", dueDate: "2026-10-10", createdBy: "Owner" });
  assert.ok(created.ok);

  const kept = await updateTask({ scope: SCOPE, taskId: created.value.id, patch: { notes: "# Plan" } });
  assert.ok(kept.ok);
  assert.equal(kept.value.assigneeId, "u-ana");
  assert.equal(kept.value.notes, "# Plan");

  const cleared = await updateTask({ scope: SCOPE, taskId: created.value.id, patch: { assigneeId: null, dueDate: "" } });
  assert.ok(cleared.ok);
  assert.equal(cleared.value.assigneeId, null);
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

test("createTask rejects an assignee who is not a member of the client", async () => {
  const { tasks, createTask } = setup();

  const stranger = await createTask({ scope: SCOPE, title: "x", assigneeId: "u-desconocido", createdBy: "Owner" });

  assert.deepEqual(stranger, { ok: false, error: { kind: "assignee_not_member" } });
  assert.deepEqual(await tasks.list(SCOPE), []);
});

test("updateTask rejects reassigning to a non-member but keeps an existing assignee untouched", async () => {
  const { tasks, createTask, updateTask } = setup();
  const created = await createTask({ scope: SCOPE, title: "Login", assigneeId: "u-ana", createdBy: "Owner" });
  assert.ok(created.ok);

  const rejected = await updateTask({ scope: SCOPE, taskId: created.value.id, patch: { assigneeId: "u-desconocido" } });
  assert.deepEqual(rejected, { ok: false, error: { kind: "assignee_not_member" } });
  assert.equal((await tasks.getById(SCOPE, created.value.id))?.assigneeId, "u-ana");

  const same = await updateTask({ scope: SCOPE, taskId: created.value.id, patch: { assigneeId: "u-ana", status: "done" } });
  assert.ok(same.ok);
});
