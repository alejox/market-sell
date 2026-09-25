import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FakeSupabaseClient } from "@/shared/infrastructure/supabase/fake-supabase-client";
import type { Client } from "@/modules/clients/domain/client";
import { SupabaseClientRepository } from "./supabase-client-repository";

const ORIGINAL_OWNER_ID = process.env.SUPABASE_OWNER_ID;
afterEach(() => {
  if (ORIGINAL_OWNER_ID === undefined) delete process.env.SUPABASE_OWNER_ID;
  else process.env.SUPABASE_OWNER_ID = ORIGINAL_OWNER_ID;
});

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "client-1",
    name: "Marca propia",
    owner: "Owner",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("save stamps owner_id from verified claims and round-trips through list/getById", async () => {
  process.env.SUPABASE_OWNER_ID = "owner-uuid";
  const fake = new FakeSupabaseClient();
  fake.setClaims({ sub: "owner-uuid" });
  const repo = new SupabaseClientRepository(async () => fake as unknown as SupabaseClient);
  const client = makeClient();

  await repo.save(client);

  const row = fake.rowsOf("clients")[0] as Record<string, unknown>;
  assert.equal(row.owner_id, "owner-uuid");
  assert.equal(row.id, "client-1");

  assert.deepEqual(await repo.list(), [client]);
  assert.deepEqual(await repo.getById("client-1"), client);
  assert.equal(await repo.getById("missing"), null);
});

test("save refuses to write when the request's owner claim does not match SUPABASE_OWNER_ID", async () => {
  process.env.SUPABASE_OWNER_ID = "owner-uuid";
  const fake = new FakeSupabaseClient();
  fake.setClaims({ sub: "attacker" });
  const repo = new SupabaseClientRepository(async () => fake as unknown as SupabaseClient);

  await assert.rejects(() => repo.save(makeClient()));
  assert.deepEqual(fake.rowsOf("clients"), []);
});
