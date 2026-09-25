import assert from "node:assert/strict";
import { test } from "node:test";
import { createApproveProposal } from "./approve-proposal";
import { InMemoryProposalRepository } from "@/modules/strategy/infrastructure/in-memory-proposal-repository";
import { InMemoryReviewDecisionRepository } from "@/modules/review/infrastructure/in-memory-review-decision-repository";
import type { Proposal } from "@/modules/strategy/domain/proposal";

const SCOPE = { clientId: "client-1", brandId: "brand-1" };
const NOW = "2026-02-01T00:00:00.000Z";

class FixedClock {
  now(): string {
    return NOW;
  }
}
class SequentialIds {
  private count = 0;
  next(): string {
    this.count += 1;
    return `decision-${this.count}`;
  }
}

function makeInReviewProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: "proposal-1",
    clientId: SCOPE.clientId,
    brandId: SCOPE.brandId,
    briefId: "brief-1",
    proposalThreadId: "brief-1",
    version: 3,
    parentVersion: 2,
    state: "in_review",
    content: {} as Proposal["content"],
    sourceReferences: [],
    generation: null,
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
    submittedAt: "2026-01-15T00:00:00.000Z",
    approvedAt: null,
    approvedBy: null,
    ...overrides,
  };
}

test("approveProposal records the approver, timestamp, and exact version", async () => {
  const proposals = new InMemoryProposalRepository();
  const reviewDecisions = new InMemoryReviewDecisionRepository();
  await proposals.save(makeInReviewProposal());
  const approveProposal = createApproveProposal({
    proposals,
    reviewDecisions,
    clock: new FixedClock(),
    ids: new SequentialIds(),
    reviewer: "Ana",
  });

  const result = await approveProposal({ scope: SCOPE, proposalId: "proposal-1" });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.state, "approved");
  assert.equal(result.value.approvedBy, "Ana");
  assert.equal(result.value.approvedAt, NOW);
  assert.equal(result.value.version, 3);

  const decisions = await reviewDecisions.listByProposal(SCOPE, "proposal-1");
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].decision, "approved");
  assert.equal(decisions[0].reviewer, "Ana");
  assert.equal(decisions[0].version, 3);
  assert.equal(decisions[0].feedback, null);
});

test("approveProposal rejects a proposal that is not in_review", async () => {
  const proposals = new InMemoryProposalRepository();
  const reviewDecisions = new InMemoryReviewDecisionRepository();
  await proposals.save(makeInReviewProposal({ state: "draft" }));
  const approveProposal = createApproveProposal({
    proposals,
    reviewDecisions,
    clock: new FixedClock(),
    ids: new SequentialIds(),
    reviewer: "Ana",
  });

  const result = await approveProposal({ scope: SCOPE, proposalId: "proposal-1" });

  assert.deepEqual(result, { ok: false, error: { kind: "invalid_transition", from: "draft", action: "approve" } });
  assert.deepEqual(await reviewDecisions.list(SCOPE), []);
});
