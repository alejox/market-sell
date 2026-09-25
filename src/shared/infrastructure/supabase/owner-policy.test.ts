import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedOwner } from "./owner-policy";

test("allows only the configured owner subject from verified claims", () => {
  assert.equal(isAllowedOwner({ sub: "owner-uuid" }, "owner-uuid"), true);
  assert.equal(isAllowedOwner({ sub: "other-uuid" }, "owner-uuid"), false);
});

test("fails closed for absent, empty, or malformed configuration and claims", () => {
  assert.equal(isAllowedOwner({ sub: "owner-uuid" }, undefined), false);
  assert.equal(isAllowedOwner({ sub: "owner-uuid" }, ""), false);
  assert.equal(isAllowedOwner(null, "owner-uuid"), false);
  assert.equal(isAllowedOwner({ sub: 12 }, "owner-uuid"), false);
});
