import assert from "node:assert/strict";
import { test } from "node:test";
import { createArchiveProposal } from "./archive-proposal";
import { InMemoryProposalRepository } from "@/modules/strategy/infrastructure/in-memory-proposal-repository";
import type { Proposal } from "@/modules/strategy/domain/proposal";

const SCOPE = { clientId: "client-1", brandId: "brand-1" };
const NOW = "2026-02-01T00:00:00.000Z";

class FixedClock {
  now(): string {
    return NOW;
  }
}

function makeApprovedProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: "proposal-1",
    clientId: SCOPE.clientId,
    brandId: SCOPE.brandId,
    briefId: "brief-1",
    proposalThreadId: "brief-1",
    version: 1,
    parentVersion: null,
    state: "approved",
    content: {} as Proposal["content"],
    sourceReferences: [],
    generation: null,
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
    submittedAt: "2026-01-15T00:00:00.000Z",
    approvedAt: "2026-01-20T00:00:00.000Z",
    approvedBy: "Ana",
    ...overrides,
  };
}

test("archiveProposal archives an approved proposal", async () => {
  const proposals = new InMemoryProposalRepository();
  await proposals.save(makeApprovedProposal());
  const archiveProposal = createArchiveProposal({ proposals, clock: new FixedClock() });

  const result = await archiveProposal({ scope: SCOPE, proposalId: "proposal-1" });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.state, "archived");
});

test("archiveProposal rejects an already-archived proposal", async () => {
  const proposals = new InMemoryProposalRepository();
  await proposals.save(makeApprovedProposal({ state: "archived" }));
  const archiveProposal = createArchiveProposal({ proposals, clock: new FixedClock() });

  const result = await archiveProposal({ scope: SCOPE, proposalId: "proposal-1" });

  assert.deepEqual(result, { ok: false, error: { kind: "invalid_transition", from: "archived", action: "archive" } });
});
