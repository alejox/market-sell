import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareTasks,
  groupTasksByStatus,
  isIsoDate,
  isOverdue,
  knownAssignees,
  normalizeAssignee,
  normalizeDueDate,
  summarizeTasks,
  type DevTask,
} from "./dev-task";

function makeTask(overrides: Partial<DevTask> = {}): DevTask {
  return {
    id: "t1",
    clientId: "client-1",
    brandId: "brand-1",
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

test("normalizeAssignee trims, collapses whitespace and maps blank to null", () => {
  assert.equal(normalizeAssignee("  Ana   María "), "Ana María");
  assert.equal(normalizeAssignee("   "), null);
  assert.equal(normalizeAssignee(null), null);
  assert.equal(normalizeAssignee(undefined), null);
});

test("isIsoDate accepts real calendar dates only", () => {
  assert.equal(isIsoDate("2026-02-28"), true);
  assert.equal(isIsoDate("2028-02-29"), true);
  assert.equal(isIsoDate("2026-02-29"), false);
  assert.equal(isIsoDate("2026-02-31"), false);
  assert.equal(isIsoDate("2026-13-01"), false);
  assert.equal(isIsoDate("02/10/2026"), false);
  assert.equal(isIsoDate(""), false);
});

test("normalizeDueDate maps blank to null and flags garbage as invalid", () => {
  assert.equal(normalizeDueDate(""), null);
  assert.equal(normalizeDueDate(null), null);
  assert.equal(normalizeDueDate(" 2026-10-05 "), "2026-10-05");
  assert.equal(normalizeDueDate("mañana"), "invalid");
});

test("compareTasks orders by priority, then nearest deadline (none last), then oldest", () => {
  const low = makeTask({ id: "low", priority: "low" });
  const highLate = makeTask({ id: "highLate", priority: "high", dueDate: "2026-12-01" });
  const highSoon = makeTask({ id: "highSoon", priority: "high", dueDate: "2026-10-05" });
  const highNone = makeTask({ id: "highNone", priority: "high" });
  const medOld = makeTask({ id: "medOld", createdAt: "2026-09-01T00:00:00.000Z" });
  const medNew = makeTask({ id: "medNew", createdAt: "2026-09-15T00:00:00.000Z" });

  const sorted = [low, medNew, highNone, medOld, highLate, highSoon].sort(compareTasks).map((t) => t.id);

  assert.deepEqual(sorted, ["highSoon", "highLate", "highNone", "medOld", "medNew", "low"]);
});

test("groupTasksByStatus buckets every status, including empty ones", () => {
  const groups = groupTasksByStatus([
    makeTask({ id: "a", status: "todo" }),
    makeTask({ id: "b", status: "done" }),
    makeTask({ id: "c", status: "todo", priority: "high" }),
  ]);

  assert.deepEqual(groups.todo.map((t) => t.id), ["c", "a"]);
  assert.deepEqual(groups.done.map((t) => t.id), ["b"]);
  assert.deepEqual(groups.in_progress, []);
  assert.deepEqual(groups.in_review, []);
});

test("isOverdue ignores done tasks and tasks without a deadline", () => {
  assert.equal(isOverdue(makeTask({ dueDate: "2026-10-01" }), "2026-10-02"), true);
  assert.equal(isOverdue(makeTask({ dueDate: "2026-10-02" }), "2026-10-02"), false);
  assert.equal(isOverdue(makeTask({ dueDate: "2026-10-01", status: "done" }), "2026-10-02"), false);
  assert.equal(isOverdue(makeTask({ dueDate: null }), "2026-10-02"), false);
});

test("summarizeTasks counts statuses, overdue, unassigned and open work per assignee", () => {
  const summary = summarizeTasks(
    [
      makeTask({ id: "1", assignee: "Ana", status: "in_progress", dueDate: "2026-09-30" }),
      makeTask({ id: "2", assignee: "Ana", status: "todo" }),
      makeTask({ id: "3", assignee: "Luis", status: "done", dueDate: "2026-09-01" }),
      makeTask({ id: "4", assignee: null, status: "in_review" }),
      makeTask({ id: "5", assignee: "Luis", status: "todo" }),
      makeTask({ id: "6", assignee: "Zoe", status: "todo" }),
    ],
    "2026-10-02",
  );

  assert.equal(summary.total, 6);
  assert.deepEqual(summary.byStatus, { todo: 3, in_progress: 1, in_review: 1, done: 1 });
  assert.equal(summary.overdue, 1);
  assert.equal(summary.unassigned, 1);
  assert.deepEqual(summary.openByAssignee, [
    { assignee: "Ana", open: 2 },
    { assignee: "Luis", open: 1 },
    { assignee: "Zoe", open: 1 },
  ]);
});

test("knownAssignees de-duplicates case-insensitively and sorts", () => {
  const names = knownAssignees([
    makeTask({ assignee: "luis" }),
    makeTask({ assignee: "Ana" }),
    makeTask({ assignee: "Luis" }),
    makeTask({ assignee: null }),
  ]);

  assert.deepEqual(names, ["Ana", "luis"]);
});
