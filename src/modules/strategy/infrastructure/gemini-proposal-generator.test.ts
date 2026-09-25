import assert from "node:assert/strict";
import { test } from "node:test";
import { GeminiProposalGenerator } from "./gemini-proposal-generator";

test("isAvailable is false without an API key", () => {
  // An explicit "" rather than `undefined` — this project's environment may
  // have a real GEMINI_API_KEY set, and `undefined` falls back to it (that
  // fallback is what lets the composition root construct this with no
  // options). "" is never nullish, so it is used as-is and never leaks the
  // ambient key.
  const generator = new GeminiProposalGenerator({ apiKey: "", model: "gemini-3.8-flash" });
  assert.equal(generator.isAvailable(), false);
});

test("isAvailable is false for a blank API key", () => {
  const generator = new GeminiProposalGenerator({ apiKey: "   " });
  assert.equal(generator.isAvailable(), false);
});

test("isAvailable is true once an API key is set", () => {
  const generator = new GeminiProposalGenerator({ apiKey: "test-key" });
  assert.equal(generator.isAvailable(), true);
});

test("generate returns 'unavailable' without an API key and makes no network call", async () => {
  const generator = new GeminiProposalGenerator({ apiKey: "" });
  const result = await generator.generate("any prompt");
  assert.deepEqual(result, { ok: false, error: { kind: "unavailable" } });
});

test("defaults to the configured GEMINI_MODEL default when none is supplied", () => {
  const generator = new GeminiProposalGenerator({ apiKey: "test-key" });
  assert.equal(generator.modelId, "gemini-3.8-flash");
});

test("uses an explicitly supplied model over the default", () => {
  const generator = new GeminiProposalGenerator({ apiKey: "test-key", model: "gemini-custom" });
  assert.equal(generator.modelId, "gemini-custom");
});
