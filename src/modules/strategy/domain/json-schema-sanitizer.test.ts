import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { sanitizeForGemini } from "./json-schema-sanitizer";
import { getProposalContentJsonSchema } from "./proposal-content.schema";

function findKeyDeep(node: unknown, key: string): boolean {
  if (Array.isArray(node)) {
    return node.some((item) => findKeyDeep(item, key));
  }
  if (node && typeof node === "object") {
    if (key in (node as Record<string, unknown>)) {
      return true;
    }
    return Object.values(node as Record<string, unknown>).some((value) => findKeyDeep(value, key));
  }
  return false;
}

test("drops $schema, $defs, and additionalProperties", () => {
  const shared = z.object({ label: z.string() });
  const schema = z.object({
    a: shared,
    b: shared,
    c: z.string().nullable(),
  });
  const sanitized = sanitizeForGemini(z.toJSONSchema(schema)) as Record<string, unknown>;

  assert.equal("$schema" in sanitized, false);
  assert.equal("$defs" in sanitized, false);
  assert.equal(findKeyDeep(sanitized, "$ref"), false);
  assert.equal(findKeyDeep(sanitized, "additionalProperties"), false);
});

test("collapses zod's nullable anyOf pattern into the nullable keyword", () => {
  const schema = z.object({ maybe: z.string().nullable() });
  const sanitized = sanitizeForGemini(z.toJSONSchema(schema)) as {
    properties: { maybe: { type?: string; nullable?: boolean; anyOf?: unknown } };
  };

  const maybe = sanitized.properties.maybe;
  assert.equal(maybe.anyOf, undefined);
  assert.equal(maybe.nullable, true);
  assert.equal(maybe.type, "string");
});

test("collapses zod's pre-collapsed type:[T,\"null\"] array into a single type plus nullable", () => {
  const schema = z.object({ maybe: z.string().nullable() });
  // zod itself rewrites primitive-branch anyOf into a bare `type` array before
  // we ever see it, so this exercises the array-form branch specifically.
  const raw = z.toJSONSchema(schema) as unknown as {
    properties: { maybe: { type: unknown } };
  };
  assert.deepEqual(raw.properties.maybe.type, ["string", "null"]);

  const sanitized = sanitizeForGemini(raw) as {
    properties: { maybe: { type?: string; nullable?: boolean } };
  };
  assert.equal(sanitized.properties.maybe.type, "string");
  assert.equal(sanitized.properties.maybe.nullable, true);
});

test("the sanitized proposal content schema has no $ref, $defs, $schema, or additionalProperties", () => {
  const sanitized = getProposalContentJsonSchema();
  assert.equal(findKeyDeep(sanitized, "$ref"), false);
  assert.equal(findKeyDeep(sanitized, "$defs"), false);
  assert.equal(findKeyDeep(sanitized, "$schema"), false);
  assert.equal(findKeyDeep(sanitized, "additionalProperties"), false);
});
