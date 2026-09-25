import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FakeSupabaseClient } from "@/shared/infrastructure/supabase/fake-supabase-client";
import type { Proposal } from "@/modules/strategy/domain/proposal";
import type { ProposalContent } from "@/modules/strategy/domain/proposal-content.schema";
import { SupabaseProposalRepository } from "./supabase-proposal-repository";

const SCOPE_A = { clientId: "client-1", brandId: "brand-a" };
const SCOPE_B = { clientId: "client-1", brandId: "brand-b" };

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: "proposal-1",
    clientId: SCOPE_A.clientId,
    brandId: SCOPE_A.brandId,
    briefId: "brief-1",
    proposalThreadId: "thread-1",
    version: 1,
    parentVersion: null,
    state: "draft",
    content: { sections: "stub" } as unknown as ProposalContent,
    sourceReferences: ["fact-1"],
    generation: { provider: "google", model: "gemini-3.8-flash", generatedAt: "2026-01-01T00:00:00.000Z" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
    ...overrides,
  };
}

test("save round-trips content jsonb and generation metadata exactly", async () => {
  const fake = new FakeSupabaseClient();
  const repo = new SupabaseProposalRepository(async () => fake as unknown as SupabaseClient);
  const proposal = makeProposal();

  await repo.save(proposal);

  assert.deepEqual(await repo.getById(SCOPE_A, "proposal-1"), proposal);
});

test("listByThread returns every version in the thread, scoped by client and brand", async () => {
  const fake = new FakeSupabaseClient();
  const repo = new SupabaseProposalRepository(async () => fake as unknown as SupabaseClient);
  await repo.save(makeProposal({ id: "p1", version: 1 }));
  await repo.save(makeProposal({ id: "p2", version: 2, parentVersion: 1 }));
  await repo.save(makeProposal({ id: "other", proposalThreadId: "thread-2", version: 1 }));

  const thread = await repo.listByThread(SCOPE_A, "thread-1");
  assert.deepEqual(
    thread.map((p) => p.id).sort(),
    ["p1", "p2"],
  );
});

test("brand B cannot read brand A's proposals by id or by thread", async () => {
  const fake = new FakeSupabaseClient();
  const repo = new SupabaseProposalRepository(async () => fake as unknown as SupabaseClient);
  await repo.save(makeProposal({}));

  assert.equal(await repo.getById(SCOPE_B, "proposal-1"), null);
  assert.deepEqual(await repo.listByThread(SCOPE_B, "thread-1"), []);
});
