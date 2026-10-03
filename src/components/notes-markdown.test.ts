import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInline, parseNotes } from "./notes-markdown";

test("parseInline handles bold, italic, code and nesting", () => {
  assert.deepEqual(parseInline("a **b** c"), [
    { type: "text", value: "a " },
    { type: "strong", children: [{ type: "text", value: "b" }] },
    { type: "text", value: " c" },
  ]);
  assert.deepEqual(parseInline("*hola*"), [{ type: "em", children: [{ type: "text", value: "hola" }] }]);
  assert.deepEqual(parseInline("`a*b*`"), [{ type: "code", value: "a*b*" }]);
  assert.deepEqual(parseInline("**x *y* z**"), [
    {
      type: "strong",
      children: [
        { type: "text", value: "x " },
        { type: "em", children: [{ type: "text", value: "y" }] },
        { type: "text", value: " z" },
      ],
    },
  ]);
});

test("parseInline only links http(s) URLs; other schemes and stray markers stay text", () => {
  assert.deepEqual(parseInline("[doc](https://ventex.app/x)"), [
    { type: "link", href: "https://ventex.app/x", children: [{ type: "text", value: "doc" }] },
  ]);
  assert.deepEqual(parseInline("[x](javascript:alert(1))"), [{ type: "text", value: "[x](javascript:alert(1))" }]);
  assert.deepEqual(parseInline("2 * 3 * 4"), [{ type: "text", value: "2 * 3 * 4" }]);
  assert.deepEqual(parseInline("<script>alert(1)</script>"), [{ type: "text", value: "<script>alert(1)</script>" }]);
});

test("parseNotes builds headings, lists, checklists, quotes, rules and code blocks", () => {
  const blocks = parseNotes(
    ["# Plan", "", "- uno", "- dos", "", "- [x] listo", "- [ ] falta", "", "1. a", "2. b", "", "> cita", "---", "```", "const x = 1;", "```"].join("\n"),
  );

  assert.deepEqual(
    blocks.map((b) => b.type),
    ["heading", "list", "list", "list", "quote", "rule", "code"],
  );
  const bullets = blocks[1];
  assert.ok(bullets.type === "list" && !bullets.ordered && bullets.items.length === 2);
  const checklist = blocks[2];
  assert.ok(checklist.type === "list");
  assert.deepEqual(checklist.items.map((i) => i.checked), [true, false]);
  const ordered = blocks[3];
  assert.ok(ordered.type === "list" && ordered.ordered);
  const code = blocks[6];
  assert.ok(code.type === "code");
  assert.equal(code.value, "const x = 1;");
});

test("consecutive lines form one paragraph; a blank line splits paragraphs", () => {
  const blocks = parseNotes("línea 1\nlínea 2\n\notra");
  assert.equal(blocks.length, 2);
  assert.ok(blocks[0].type === "paragraph" && blocks[0].lines.length === 2);
});

test("an unterminated code fence swallows the rest instead of looping or throwing", () => {
  const blocks = parseNotes("```\nabc\ndef");
  assert.deepEqual(blocks, [{ type: "code", value: "abc\ndef" }]);
});

test("empty input and CRLF line endings are handled", () => {
  assert.deepEqual(parseNotes(""), []);
  assert.equal(parseNotes("# A\r\n- b").length, 2);
});
