import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FakeSupabaseClient } from "./fake-supabase-client";
import { verifiedOwnerId } from "./verified-owner";

const ORIGINAL_OWNER_ID = process.env.SUPABASE_OWNER_ID;

afterEach(() => {
  if (ORIGINAL_OWNER_ID === undefined) delete process.env.SUPABASE_OWNER_ID;
  else process.env.SUPABASE_OWNER_ID = ORIGINAL_OWNER_ID;
});

test("returns the owner id when verified claims match SUPABASE_OWNER_ID", async () => {
  process.env.SUPABASE_OWNER_ID = "owner-uuid";
  const fake = new FakeSupabaseClient();
  fake.setClaims({ sub: "owner-uuid" });

  const ownerId = await verifiedOwnerId(fake as unknown as SupabaseClient);
  assert.equal(ownerId, "owner-uuid");
});

test("fails closed when claims.sub does not match SUPABASE_OWNER_ID", async () => {
  process.env.SUPABASE_OWNER_ID = "owner-uuid";
  const fake = new FakeSupabaseClient();
  fake.setClaims({ sub: "someone-else" });

  await assert.rejects(() => verifiedOwnerId(fake as unknown as SupabaseClient));
});

test("fails closed when there are no claims at all", async () => {
  process.env.SUPABASE_OWNER_ID = "owner-uuid";
  const fake = new FakeSupabaseClient();
  fake.setClaims(null);

  await assert.rejects(() => verifiedOwnerId(fake as unknown as SupabaseClient));
});

test("fails closed when getClaims returns an error", async () => {
  process.env.SUPABASE_OWNER_ID = "owner-uuid";
  const fake = new FakeSupabaseClient();
  fake.setClaims({ sub: "owner-uuid" });
  fake.setClaimsError({ name: "AuthError", message: "expired", details: "", hint: "", code: "401" } as never);

  await assert.rejects(() => verifiedOwnerId(fake as unknown as SupabaseClient));
});

test("fails closed when SUPABASE_OWNER_ID is not configured", async () => {
  delete process.env.SUPABASE_OWNER_ID;
  const fake = new FakeSupabaseClient();
  fake.setClaims({ sub: "owner-uuid" });

  await assert.rejects(() => verifiedOwnerId(fake as unknown as SupabaseClient));
});
