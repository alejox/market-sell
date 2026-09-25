import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FakeSupabaseClient } from "@/shared/infrastructure/supabase/fake-supabase-client";
import type { CampaignBrief } from "@/modules/strategy/domain/campaign-brief";
import { SupabaseBriefRepository } from "./supabase-brief-repository";

const SCOPE_A = { clientId: "client-1", brandId: "brand-a" };
const SCOPE_B = { clientId: "client-1", brandId: "brand-b" };

function makeBrief(overrides: Partial<CampaignBrief> = {}): CampaignBrief {
  return {
    id: "brief-1",
    clientId: SCOPE_A.clientId,
    brandId: SCOPE_A.brandId,
    audienceId: "audience-1",
    objective: "Objetivo",
    timeframe: "4 semanas",
    valueProposition: "Propuesta",
    budgetRange: { min: 100, max: 200, currency: "COP" },
    missingInformation: ["falta info"],
    createdBy: "Owner",
    status: "draft",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("save round-trips budget_range jsonb (including null) through list/getById", async () => {
  const fake = new FakeSupabaseClient();
  const repo = new SupabaseBriefRepository(async () => fake as unknown as SupabaseClient);
  const brief = makeBrief();
  const briefNoBudget = makeBrief({ id: "brief-2", audienceId: "audience-2", budgetRange: null });

  await repo.save(brief);
  await repo.save(briefNoBudget);

  assert.deepEqual(await repo.getById(SCOPE_A, "brief-1"), brief);
  assert.deepEqual(await repo.getById(SCOPE_A, "brief-2"), briefNoBudget);
});

test("getByAudience filters by audience_id within scope", async () => {
  const fake = new FakeSupabaseClient();
  const repo = new SupabaseBriefRepository(async () => fake as unknown as SupabaseClient);
  await repo.save(makeBrief({ id: "brief-1", audienceId: "audience-1" }));
  await repo.save(makeBrief({ id: "brief-2", audienceId: "audience-2" }));

  const found = await repo.getByAudience(SCOPE_A, "audience-2");
  assert.equal(found?.id, "brief-2");
  assert.equal(await repo.getByAudience(SCOPE_A, "audience-missing"), null);
});

test("brand B cannot read brand A's briefs by id or by audience", async () => {
  const fake = new FakeSupabaseClient();
  const repo = new SupabaseBriefRepository(async () => fake as unknown as SupabaseClient);
  await repo.save(makeBrief({}));

  assert.deepEqual(await repo.list(SCOPE_B), []);
  assert.equal(await repo.getById(SCOPE_B, "brief-1"), null);
  assert.equal(await repo.getByAudience(SCOPE_B, "audience-1"), null);
});
