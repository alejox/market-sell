/**
 * Strips and rewrites zod v4's JSON Schema output into the subset Gemini
 * structured-output accepts: inlines `$defs`/`$ref` (Gemini has no `$ref`
 * support, only emitted by zod on cyclical schemas), collapses zod's two
 * `.nullable()` shapes — `anyOf: [T, {type:"null"}]` for object/array
 * branches, and `type: [T, "null"]` for zod's own pre-collapsed primitive
 * branches — into `{ ...T, nullable: true }` with a single string `type`,
 * and drops `$schema`, `$id`, and `additionalProperties`, which Gemini
 * rejects.
 */

type JsonSchemaObject = Record<string, unknown>;

function isRecord(value: unknown): value is JsonSchemaObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const DROPPED_KEYS = new Set(["$schema", "$id", "$defs", "additionalProperties"]);

export function sanitizeForGemini(schema: unknown): unknown {
  if (!isRecord(schema)) {
    return schema;
  }

  const defs = isRecord(schema.$defs) ? (schema.$defs as Record<string, unknown>) : {};

  function resolveRef(ref: string): unknown {
    const key = ref.replace(/^#\/\$defs\//, "");
    if (!(key in defs)) {
      throw new Error(`json-schema-sanitizer: unresolvable $ref "${ref}"`);
    }
    return defs[key];
  }

  function collapseNullableAnyOf(node: JsonSchemaObject): JsonSchemaObject | null {
    if (!Array.isArray(node.anyOf) || node.anyOf.length !== 2) {
      return null;
    }
    const [a, b] = node.anyOf as unknown[];
    const isNullBranch = (entry: unknown): entry is JsonSchemaObject =>
      isRecord(entry) && entry.type === "null";
    const nullBranch = isNullBranch(a) ? a : isNullBranch(b) ? b : undefined;
    const otherBranch = nullBranch === a ? b : a;
    if (!nullBranch || !isRecord(otherBranch)) {
      return null;
    }
    const rest: JsonSchemaObject = {};
    for (const [key, value] of Object.entries(node)) {
      if (key !== "anyOf") {
        rest[key] = value;
      }
    }
    return { ...rest, ...otherBranch, nullable: true };
  }

  function collapseNullableTypeArray(node: JsonSchemaObject): JsonSchemaObject | null {
    if (!Array.isArray(node.type)) {
      return null;
    }
    const types = node.type as unknown[];
    if (types.length !== 2 || !types.includes("null")) {
      return null;
    }
    const singleType = types.find((entry) => entry !== "null");
    if (typeof singleType !== "string") {
      return null;
    }
    return { ...node, type: singleType, nullable: true };
  }

  function walk(node: unknown, refChain: readonly string[]): unknown {
    if (Array.isArray(node)) {
      return node.map((item) => walk(item, refChain));
    }
    if (!isRecord(node)) {
      return node;
    }

    if (typeof node.$ref === "string") {
      if (refChain.includes(node.$ref)) {
        throw new Error(`json-schema-sanitizer: circular $ref "${node.$ref}" is not supported`);
      }
      return walk(resolveRef(node.$ref), [...refChain, node.$ref]);
    }

    const source = collapseNullableAnyOf(node) ?? collapseNullableTypeArray(node) ?? node;

    const out: JsonSchemaObject = {};
    for (const [key, value] of Object.entries(source)) {
      if (DROPPED_KEYS.has(key)) {
        continue;
      }
      out[key] = walk(value, refChain);
    }
    return out;
  }

  return walk(schema, []);
}
