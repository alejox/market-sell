import assert from "node:assert/strict";
import { test } from "node:test";
import { comparePersonalItems, groupPersonalItems, isPersonalKind, type PersonalItem } from "./personal-item";

function item(overrides: Partial<PersonalItem>): PersonalItem {
  return {
    id: "i",
    clientId: "c",
    brandId: "b",
    userId: "u",
    kind: "task",
    title: "t",
    body: "",
    done: false,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

test("isPersonalKind accepts only task and note", () => {
  assert.equal(isPersonalKind("task"), true);
  assert.equal(isPersonalKind("note"), true);
  assert.equal(isPersonalKind("event"), false);
  assert.equal(isPersonalKind(undefined), false);
});

test("groups open tasks, notes and finished tasks, newest edit first inside each", () => {
  const groups = groupPersonalItems([
    item({ id: "done-1", done: true, updatedAt: "2026-10-05T00:00:00.000Z" }),
    item({ id: "note-old", kind: "note", updatedAt: "2026-10-02T00:00:00.000Z" }),
    item({ id: "open-old", updatedAt: "2026-10-02T00:00:00.000Z" }),
    item({ id: "open-new", updatedAt: "2026-10-04T00:00:00.000Z" }),
    item({ id: "note-new", kind: "note", updatedAt: "2026-10-03T00:00:00.000Z" }),
  ]);

  assert.deepEqual(groups.openTasks.map((x) => x.id), ["open-new", "open-old"]);
  assert.deepEqual(groups.notes.map((x) => x.id), ["note-new", "note-old"]);
  assert.deepEqual(groups.doneTasks.map((x) => x.id), ["done-1"]);
});

test("comparePersonalItems is stable for identical timestamps", () => {
  assert.ok(comparePersonalItems(item({ id: "a" }), item({ id: "b" })) < 0);
});
