import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FakeSupabaseClient } from "@/shared/infrastructure/supabase/fake-supabase-client";
import type { ReviewDecision } from "@/modules/review/domain/review-decision";
import { SupabaseReviewDecisionRepository } from "./supabase-review-decision-repository";

const SCOPE_A = { clientId: "client-1", brandId: "brand-a" };
const SCOPE_B = { clientId: "client-1", brandId: "brand-b" };

function makeDecision(overrides: Partial<ReviewDecision> = {}): ReviewDecision {
  return {
    id: "decision-1",
    clientId: SCOPE_A.clientId,
    brandId: SCOPE_A.brandId,
    proposalId: "proposal-1",
    proposalThreadId: "thread-1",
    version: 1,
    decision: "changes_requested",
    reviewer: "Owner",
    feedback: "ajustar tono",
    decidedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("save round-trips a null feedback (approved decisions) and a populated one", async () => {
  const fake = new FakeSupabaseClient();
  const repo = new SupabaseReviewDecisionRepository(async () => fake as unknown as SupabaseClient);
  const requested = makeDecision();
  const approved = makeDecision({ id: "decision-2", decision: "approved", feedback: null });

  await repo.save(requested);
  await repo.save(approved);

  assert.deepEqual(await repo.listByProposal(SCOPE_A, "proposal-1"), [requested, approved]);
});

test("listByProposal and listByThread both filter within scope", async () => {
  const fake = new FakeSupabaseClient();
  const repo = new SupabaseReviewDecisionRepository(async () => fake as unknown as SupabaseClient);
  await repo.save(makeDecision({ id: "d1", proposalId: "proposal-1", proposalThreadId: "thread-1" }));
  await repo.save(makeDecision({ id: "d2", proposalId: "proposal-2", proposalThreadId: "thread-1" }));
  await repo.save(makeDecision({ id: "d3", proposalId: "proposal-3", proposalThreadId: "thread-2" }));

  assert.deepEqual(
    (await repo.listByProposal(SCOPE_A, "proposal-1")).map((d) => d.id),
    ["d1"],
  );
  assert.deepEqual(
    (await repo.listByThread(SCOPE_A, "thread-1")).map((d) => d.id).sort(),
    ["d1", "d2"],
  );
});

test("brand B cannot read brand A's review decisions", async () => {
  const fake = new FakeSupabaseClient();
  const repo = new SupabaseReviewDecisionRepository(async () => fake as unknown as SupabaseClient);
  await repo.save(makeDecision({}));

  assert.deepEqual(await repo.list(SCOPE_B), []);
  assert.deepEqual(await repo.listByProposal(SCOPE_B, "proposal-1"), []);
  assert.deepEqual(await repo.listByThread(SCOPE_B, "thread-1"), []);
});
