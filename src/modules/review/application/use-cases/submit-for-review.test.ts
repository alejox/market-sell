import assert from "node:assert/strict";
import { test } from "node:test";
import { createSubmitForReview } from "./submit-for-review";
import { InMemoryProposalRepository } from "@/modules/strategy/infrastructure/in-memory-proposal-repository";
import type { Proposal } from "@/modules/strategy/domain/proposal";

const SCOPE = { clientId: "client-1", brandId: "brand-1" };
const NOW = "2026-02-01T00:00:00.000Z";

class FixedClock {
  now(): string {
    return NOW;
  }
}

function makeDraftProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: "proposal-1",
    clientId: SCOPE.clientId,
    brandId: SCOPE.brandId,
    briefId: "brief-1",
    proposalThreadId: "brief-1",
    version: 1,
    parentVersion: null,
    state: "draft",
    content: {} as Proposal["content"],
    sourceReferences: [],
    generation: null,
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
    ...overrides,
  };
}

test("submitForReview moves a draft to in_review", async () => {
  const proposals = new InMemoryProposalRepository();
  await proposals.save(makeDraftProposal());
  const submitForReview = createSubmitForReview({ proposals, clock: new FixedClock() });

  const result = await submitForReview({ scope: SCOPE, proposalId: "proposal-1" });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.state, "in_review");
  assert.equal(result.value.submittedAt, NOW);

  const persisted = await proposals.getById(SCOPE, "proposal-1");
  assert.equal(persisted!.state, "in_review");
});

test("submitForReview rejects a proposal that is not a draft", async () => {
  const proposals = new InMemoryProposalRepository();
  await proposals.save(makeDraftProposal({ state: "in_review" }));
  const submitForReview = createSubmitForReview({ proposals, clock: new FixedClock() });

  const result = await submitForReview({ scope: SCOPE, proposalId: "proposal-1" });

  assert.deepEqual(result, {
    ok: false,
    error: { kind: "invalid_transition", from: "in_review", action: "submit_for_review" },
  });
});

test("submitForReview returns proposal_not_found for an unknown id", async () => {
  const proposals = new InMemoryProposalRepository();
  const submitForReview = createSubmitForReview({ proposals, clock: new FixedClock() });

  const result = await submitForReview({ scope: SCOPE, proposalId: "missing" });

  assert.deepEqual(result, { ok: false, error: { kind: "proposal_not_found" } });
});
