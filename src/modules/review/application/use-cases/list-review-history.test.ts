import assert from "node:assert/strict";
import { test } from "node:test";
import { createListReviewHistory } from "./list-review-history";
import { InMemoryReviewDecisionRepository } from "@/modules/review/infrastructure/in-memory-review-decision-repository";
import type { ReviewDecision } from "@/modules/review/domain/review-decision";

const SCOPE = { clientId: "client-1", brandId: "brand-1" };

function makeDecision(overrides: Partial<ReviewDecision>): ReviewDecision {
  return {
    id: "decision-1",
    clientId: SCOPE.clientId,
    brandId: SCOPE.brandId,
    proposalId: "proposal-1",
    proposalThreadId: "brief-1",
    version: 1,
    decision: "changes_requested",
    reviewer: "Ana",
    feedback: "Ajustar el CTA.",
    decidedAt: "2026-01-10T00:00:00.000Z",
    ...overrides,
  };
}

test("listReviewHistory returns every decision in a thread, oldest first, across versions", async () => {
  const reviewDecisions = new InMemoryReviewDecisionRepository();
  await reviewDecisions.save(makeDecision({ id: "decision-2", proposalId: "proposal-2", decidedAt: "2026-01-20T00:00:00.000Z", decision: "approved", feedback: null }));
  await reviewDecisions.save(makeDecision({ id: "decision-1", decidedAt: "2026-01-10T00:00:00.000Z" }));
  // A decision from a different thread must never show up.
  await reviewDecisions.save(makeDecision({ id: "decision-other-thread", proposalThreadId: "brief-2" }));

  const listReviewHistory = createListReviewHistory({ reviewDecisions });
  const history = await listReviewHistory({ scope: SCOPE, proposalThreadId: "brief-1" });

  assert.deepEqual(
    history.map((d) => d.id),
    ["decision-1", "decision-2"],
  );
});
