import assert from "node:assert/strict";
import { test } from "node:test";
import { INVITATION_TTL_DAYS, invitationExpiry, invitationStatus, isPending, type Invitation } from "./team";

const base: Invitation = {
  id: "inv-1",
  clientId: "client-1",
  tokenHash: "hash",
  createdAt: "2026-10-03T12:00:00.000Z",
  expiresAt: "2026-10-10T12:00:00.000Z",
  usedAt: null,
};

test("invitationExpiry adds the time-to-live in days", () => {
  assert.equal(INVITATION_TTL_DAYS, 7);
  assert.equal(invitationExpiry("2026-10-03T12:00:00.000Z"), "2026-10-10T12:00:00.000Z");
});

test("invitationStatus: valid before expiry and unused", () => {
  assert.equal(invitationStatus(base, "2026-10-05T00:00:00.000Z"), "valid");
  assert.equal(isPending(base, "2026-10-05T00:00:00.000Z"), true);
});

test("invitationStatus: expired exactly at the expiry instant", () => {
  assert.equal(invitationStatus(base, base.expiresAt), "expired");
  assert.equal(isPending(base, "2026-11-01T00:00:00.000Z"), false);
});

test("invitationStatus: used wins over expired, and a missing invitation is invalid", () => {
  assert.equal(invitationStatus({ ...base, usedAt: "2026-10-04T00:00:00.000Z" }, "2026-12-01T00:00:00.000Z"), "used");
  assert.equal(invitationStatus(null, "2026-10-05T00:00:00.000Z"), "invalid");
  assert.equal(invitationStatus(undefined, "2026-10-05T00:00:00.000Z"), "invalid");
});
