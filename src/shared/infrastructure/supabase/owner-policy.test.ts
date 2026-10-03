import assert from "node:assert/strict";
import test from "node:test";
import { hasWorkspaceAccess, isAllowedOwner } from "./owner-policy";

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

test("workspace access: the owner needs no membership row", () => {
  assert.equal(hasWorkspaceAccess({ sub: "owner-uuid" }, "owner-uuid", false), true);
});

test("workspace access: a member is allowed, a stranger is not", () => {
  assert.equal(hasWorkspaceAccess({ sub: "member-uuid" }, "owner-uuid", true), true);
  assert.equal(hasWorkspaceAccess({ sub: "stranger-uuid" }, "owner-uuid", false), false);
});

test("workspace access fails closed without a verified subject, even if a membership lookup said yes", () => {
  assert.equal(hasWorkspaceAccess(null, "owner-uuid", true), false);
  assert.equal(hasWorkspaceAccess({}, "owner-uuid", true), false);
  assert.equal(hasWorkspaceAccess({ sub: "" }, "owner-uuid", true), false);
  assert.equal(hasWorkspaceAccess({ sub: 7 }, "owner-uuid", true), false);
});
