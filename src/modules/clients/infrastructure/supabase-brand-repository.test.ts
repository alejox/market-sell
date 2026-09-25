import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FakeSupabaseClient } from "@/shared/infrastructure/supabase/fake-supabase-client";
import type { Brand } from "@/modules/clients/domain/brand";
import { SupabaseBrandRepository } from "./supabase-brand-repository";

function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: "brand-1",
    clientId: "client-1",
    name: "Ventex",
    website: "https://www.ventex.app/",
    productFacts: [{ id: "fact-1", statement: "x", provenance: "verified_website", sourceUrl: "https://x", approvedForAds: false }],
    voice: "Cercano",
    constraints: ["no promises"],
    assets: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("save maps camelCase to snake_case columns, including jsonb product_facts", async () => {
  const fake = new FakeSupabaseClient();
  const repo = new SupabaseBrandRepository(async () => fake as unknown as SupabaseClient);
  const brand = makeBrand();

  await repo.save(brand);

  const row = fake.rowsOf("brands")[0] as Record<string, unknown>;
  assert.equal(row.client_id, "client-1");
  assert.deepEqual(row.product_facts, brand.productFacts);
  assert.deepEqual(await repo.getById("client-1", "brand-1"), brand);
});

test("listByClient and getById filter by client_id, not just by brand id", async () => {
  const fake = new FakeSupabaseClient();
  const repo = new SupabaseBrandRepository(async () => fake as unknown as SupabaseClient);
  await repo.save(makeBrand({ id: "brand-a", clientId: "client-1", name: "A" }));
  await repo.save(makeBrand({ id: "brand-b", clientId: "client-2", name: "B" }));

  const forClient1 = await repo.listByClient("client-1");
  assert.equal(forClient1.length, 1);
  assert.equal(forClient1[0]?.name, "A");

  // Correct id, wrong client — must not resolve, even though the row exists.
  assert.equal(await repo.getById("client-2", "brand-a"), null);
  assert.equal((await repo.getById("client-1", "brand-a"))?.name, "A");
  assert.equal(await repo.getById("client-2", "does-not-exist"), null);
});

test("insertIfAbsent never overwrites an existing brand, even with different content", async () => {
  const fake = new FakeSupabaseClient();
  const repo = new SupabaseBrandRepository(async () => fake as unknown as SupabaseClient);
  const brand = makeBrand();

  const inserted = await repo.insertIfAbsent(brand);
  const insertedAgain = await repo.insertIfAbsent({ ...brand, name: "Owner-edited name" });

  assert.equal(inserted, true);
  assert.equal(insertedAgain, false);
  assert.equal((await repo.getById("client-1", "brand-1"))?.name, "Ventex");
});
