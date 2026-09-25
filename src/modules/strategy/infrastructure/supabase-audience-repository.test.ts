import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FakeSupabaseClient } from "@/shared/infrastructure/supabase/fake-supabase-client";
import type { Audience } from "@/modules/strategy/domain/audience";
import { SupabaseAudienceRepository } from "./supabase-audience-repository";

const SCOPE_A = { clientId: "client-1", brandId: "brand-a" };
const SCOPE_B = { clientId: "client-1", brandId: "brand-b" };

function makeAudience(overrides: Partial<Audience> = {}): Audience {
  return {
    id: "audience-1",
    clientId: SCOPE_A.clientId,
    brandId: SCOPE_A.brandId,
    segmentName: "Tiendas",
    geography: "Colombia",
    pains: [{ value: "pierden ventas", basis: "hypothesis" }],
    objections: [{ value: "ya usan excel", basis: "hypothesis" }],
    hypotheses: ["h1"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("save round-trips nested Claim<string> jsonb fields exactly through list/getById", async () => {
  const fake = new FakeSupabaseClient();
  const repo = new SupabaseAudienceRepository(async () => fake as unknown as SupabaseClient);
  const audience = makeAudience();

  await repo.save(audience);

  const row = fake.rowsOf("audiences")[0] as Record<string, unknown>;
  assert.equal(row.segment_name, "Tiendas");
  assert.deepEqual(row.pains, audience.pains);
  assert.deepEqual(await repo.list(SCOPE_A), [audience]);
  assert.deepEqual(await repo.getById(SCOPE_A, "audience-1"), audience);
});

test("brand B cannot read brand A's audience, even with the exact id", async () => {
  const fake = new FakeSupabaseClient();
  const repo = new SupabaseAudienceRepository(async () => fake as unknown as SupabaseClient);
  await repo.save(makeAudience());

  assert.deepEqual(await repo.list(SCOPE_B), []);
  assert.equal(await repo.getById(SCOPE_B, "audience-1"), null);
});
