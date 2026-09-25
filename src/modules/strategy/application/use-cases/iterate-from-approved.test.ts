import assert from "node:assert/strict";
import { test } from "node:test";
import { createIterateFromApproved } from "./iterate-from-approved";
import { InMemoryBrandRepository } from "@/modules/clients/infrastructure/in-memory-brand-repository";
import { InMemoryAudienceRepository } from "@/modules/strategy/infrastructure/in-memory-audience-repository";
import { InMemoryBriefRepository } from "@/modules/strategy/infrastructure/in-memory-brief-repository";
import { InMemoryProposalRepository } from "@/modules/strategy/infrastructure/in-memory-proposal-repository";
import { InMemoryResultSnapshotRepository } from "@/modules/results/infrastructure/in-memory-result-snapshot-repository";
import type { Proposal } from "@/modules/strategy/domain/proposal";
import type { ResultSnapshot } from "@/modules/results/domain/result-snapshot";
import {
  FakeProposalGenerator,
  FixedClock,
  SequentialIds,
  SCOPE,
  makeAudience,
  makeBrand,
  makeBrief,
  makeProposalContent,
} from "./test-fixtures";

const NOW = "2026-03-01T00:00:00.000Z";

function makeDeps(generator: FakeProposalGenerator) {
  return {
    brands: new InMemoryBrandRepository(),
    audiences: new InMemoryAudienceRepository(),
    briefs: new InMemoryBriefRepository(),
    proposals: new InMemoryProposalRepository(),
    resultSnapshots: new InMemoryResultSnapshotRepository(),
    generator,
    clock: new FixedClock(NOW),
    ids: new SequentialIds("iter"),
  };
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
    content: makeProposalContent(),
    sourceReferences: ["fact-1"],
    generation: { provider: "fake", model: "fake-model", generatedAt: "2026-01-15T00:00:00.000Z" },
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-20T00:00:00.000Z",
    submittedAt: "2026-01-15T00:00:00.000Z",
    approvedAt: "2026-01-20T00:00:00.000Z",
    approvedBy: "Owner",
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<ResultSnapshot> = {}): ResultSnapshot {
  return {
    id: "snapshot-1",
    clientId: SCOPE.clientId,
    brandId: SCOPE.brandId,
    proposalId: "proposal-1",
    proposalThreadId: "brief-1",
    period: { from: "2026-01-01", to: "2026-01-31" },
    metrics: [{ name: "Alcance", value: 1000, unit: "personas" }],
    notes: "Primer mes de campaña.",
    source: "manual_owner_entry",
    recordedBy: "Owner",
    recordedAt: "2026-02-01T00:00:00.000Z",
    ...overrides,
  };
}

async function seed(deps: ReturnType<typeof makeDeps>, proposal: Proposal) {
  await deps.brands.save(makeBrand());
  await deps.audiences.save(makeAudience());
  await deps.briefs.save(makeBrief());
  await deps.proposals.save(proposal);
}

test("iterateFromApproved creates v2 as a draft from an approved v1, leaving v1 untouched", async () => {
  const nextContent = makeProposalContent({
    campaignConcept: { ...makeProposalContent().campaignConcept, goal: "Ajustado con resultados observados." },
  });
  const generator = new FakeProposalGenerator({ ok: true, value: nextContent });
  const deps = makeDeps(generator);
  const approved = makeApprovedProposal();
  await seed(deps, approved);
  await deps.resultSnapshots.save(makeSnapshot());

  const iterateFromApproved = createIterateFromApproved(deps);
  const result = await iterateFromApproved({ scope: SCOPE, proposalId: approved.id });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const revision = result.value;
  assert.equal(revision.version, 2);
  assert.equal(revision.parentVersion, 1);
  assert.equal(revision.state, "draft");
  assert.deepEqual(revision.content, nextContent);
  assert.ok(revision.sourceReferences.includes("snapshot-1"), "source references must include the snapshot id");

  // The approved version is untouched.
  const stillApproved = await deps.proposals.getById(SCOPE, approved.id);
  assert.equal(stillApproved!.state, "approved");
  assert.equal(stillApproved!.version, 1);
  assert.deepEqual(stillApproved!.content, approved.content);

  // No review decision is recorded for this operation.
  assert.equal(generator.prompts.length, 1);
  assert.doesNotMatch(generator.prompts[0], /OWNER_FEEDBACK/);
});

test("iterateFromApproved rejects a proposal that is not approved", async () => {
  const generator = new FakeProposalGenerator({ ok: true, value: makeProposalContent() });
  const deps = makeDeps(generator);
  const draft = makeApprovedProposal({ state: "draft", approvedAt: null, approvedBy: null });
  await seed(deps, draft);

  const iterateFromApproved = createIterateFromApproved(deps);
  const result = await iterateFromApproved({ scope: SCOPE, proposalId: draft.id });

  assert.deepEqual(result, { ok: false, error: { kind: "invalid_transition", from: "draft", action: "create_revision" } });
  assert.equal(generator.prompts.length, 0);
});

test("iterateFromApproved returns 'unavailable' and persists nothing when the generator has no key", async () => {
  const generator = new FakeProposalGenerator({ ok: true, value: makeProposalContent() }, false);
  const deps = makeDeps(generator);
  const approved = makeApprovedProposal();
  await seed(deps, approved);

  const iterateFromApproved = createIterateFromApproved(deps);
  const result = await iterateFromApproved({ scope: SCOPE, proposalId: approved.id });

  assert.deepEqual(result, { ok: false, error: { kind: "unavailable" } });
  assert.equal((await deps.proposals.list(SCOPE)).length, 1);
});

test("iterateFromApproved returns proposal_not_found for an unknown id", async () => {
  const generator = new FakeProposalGenerator({ ok: true, value: makeProposalContent() });
  const deps = makeDeps(generator);
  await seed(deps, makeApprovedProposal());

  const iterateFromApproved = createIterateFromApproved(deps);
  const result = await iterateFromApproved({ scope: SCOPE, proposalId: "missing" });

  assert.deepEqual(result, { ok: false, error: { kind: "proposal_not_found" } });
});
