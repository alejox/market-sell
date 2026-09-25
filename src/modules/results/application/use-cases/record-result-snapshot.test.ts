import assert from "node:assert/strict";
import { test } from "node:test";
import { createRecordResultSnapshot } from "./record-result-snapshot";
import { InMemoryProposalRepository } from "@/modules/strategy/infrastructure/in-memory-proposal-repository";
import { InMemoryResultSnapshotRepository } from "@/modules/results/infrastructure/in-memory-result-snapshot-repository";
import type { Proposal } from "@/modules/strategy/domain/proposal";

const SCOPE = { clientId: "client-1", brandId: "brand-1" };
const NOW = "2026-02-15T00:00:00.000Z";

class FixedClock {
  now(): string {
    return NOW;
  }
}
class SequentialIds {
  private count = 0;
  next(): string {
    this.count += 1;
    return `snapshot-${this.count}`;
  }
}

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
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
    approvedBy: "Owner",
    ...overrides,
  };
}

test("recordResultSnapshot saves a manually entered snapshot scoped to the proposal's thread", async () => {
  const proposals = new InMemoryProposalRepository();
  const resultSnapshots = new InMemoryResultSnapshotRepository();
  await proposals.save(makeProposal());
  const recordResultSnapshot = createRecordResultSnapshot({
    proposals,
    resultSnapshots,
    clock: new FixedClock(),
    ids: new SequentialIds(),
  });

  const result = await recordResultSnapshot({
    scope: SCOPE,
    proposalId: "proposal-1",
    period: { from: "2026-01-01", to: "2026-01-31" },
    metrics: [{ name: "Alcance", value: 1500, unit: "personas" }],
    notes: "Primer mes.",
    source: "manual_meta_export",
    recordedBy: "Owner",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.proposalThreadId, "brief-1");
  assert.equal(result.value.recordedAt, NOW);
  assert.equal(result.value.source, "manual_meta_export");

  const persisted = await resultSnapshots.listByThread(SCOPE, "brief-1");
  assert.equal(persisted.length, 1);
  assert.deepEqual(persisted[0], result.value);
});

test("recordResultSnapshot returns proposal_not_found for an unknown proposal", async () => {
  const proposals = new InMemoryProposalRepository();
  const resultSnapshots = new InMemoryResultSnapshotRepository();
  const recordResultSnapshot = createRecordResultSnapshot({
    proposals,
    resultSnapshots,
    clock: new FixedClock(),
    ids: new SequentialIds(),
  });

  const result = await recordResultSnapshot({
    scope: SCOPE,
    proposalId: "missing",
    period: { from: "2026-01-01", to: "2026-01-31" },
    metrics: [],
    notes: "",
    source: "manual_owner_entry",
    recordedBy: "Owner",
  });

  assert.deepEqual(result, { ok: false, error: { kind: "proposal_not_found" } });
});
