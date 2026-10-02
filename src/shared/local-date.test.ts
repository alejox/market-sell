import assert from "node:assert/strict";
import { test } from "node:test";
import { localIsoDate } from "./local-date";

test("localIsoDate uses the workspace time zone, not UTC", () => {
  // 2026-10-03T02:00Z is still the evening of Oct 2 in Bogotá (UTC-5).
  assert.equal(localIsoDate(new Date("2026-10-03T02:00:00.000Z")), "2026-10-02");
  assert.equal(localIsoDate(new Date("2026-10-03T05:00:00.000Z")), "2026-10-03");
});
