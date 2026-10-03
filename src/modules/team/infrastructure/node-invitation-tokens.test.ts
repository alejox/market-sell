import assert from "node:assert/strict";
import { test } from "node:test";
import { NodeInvitationTokens } from "./node-invitation-tokens";

test("hash is deterministic SHA-256 hex and does not contain the token", () => {
  const tokens = new NodeInvitationTokens();
  const token = tokens.generate();
  assert.equal(tokens.hash(token), tokens.hash(token));
  assert.match(tokens.hash(token), /^[0-9a-f]{64}$/);
  assert.equal(tokens.hash(token).includes(token), false);
  assert.notEqual(tokens.hash(token), tokens.hash(`${token}x`));
});

test("generated tokens are URL-safe", () => {
  assert.match(new NodeInvitationTokens().generate(), /^[A-Za-z0-9_-]+$/);
});
