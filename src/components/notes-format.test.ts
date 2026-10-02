import assert from "node:assert/strict";
import { test } from "node:test";
import { applyNotesFormat } from "./notes-format";

test("bold wraps the selection and keeps it selected", () => {
  const edit = applyNotesFormat("hola mundo", 5, 10, "bold");
  assert.equal(edit.value, "hola **mundo**");
  assert.equal(edit.value.slice(edit.selectionStart, edit.selectionEnd), "mundo");
});

test("bold on an empty selection inserts a selected placeholder", () => {
  const edit = applyNotesFormat("", 0, 0, "bold");
  assert.equal(edit.value, "**negrita**");
  assert.equal(edit.value.slice(edit.selectionStart, edit.selectionEnd), "negrita");
});

test("applying the same inline format to an already wrapped selection unwraps it", () => {
  const edit = applyNotesFormat("**x**", 0, 5, "bold");
  assert.equal(edit.value, "x");
});

test("bullet prefixes every selected line and toggles off when all are prefixed", () => {
  const on = applyNotesFormat("a\nb\nc", 0, 3, "bullet");
  assert.equal(on.value, "- a\n- b\nc");
  const off = applyNotesFormat(on.value, on.selectionStart, on.selectionEnd, "bullet");
  assert.equal(off.value, "a\nb\nc");
});

test("line formats act on the whole line even when the caret is mid-line", () => {
  const edit = applyNotesFormat("uno\ndos tres", 7, 7, "heading");
  assert.equal(edit.value, "uno\n## dos tres");
});

test("checklist uses the unchecked task prefix", () => {
  assert.equal(applyNotesFormat("tarea", 0, 0, "checklist").value, "- [ ] tarea");
});

test("a reversed selection (end before start) is normalized", () => {
  assert.equal(applyNotesFormat("abc", 3, 0, "code").value, "`abc`");
});
