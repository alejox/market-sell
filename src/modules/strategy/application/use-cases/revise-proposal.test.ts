import assert from "node:assert/strict";
import { test } from "node:test";
import { createReviseProposal } from "./revise-proposal";
import { InMemoryBrandRepository } from "@/modules/clients/infrastructure/in-memory-brand-repository";
import { InMemoryAudienceRepository } from "@/modules/strategy/infrastructure/in-memory-audience-repository";
import { InMemoryBriefRepository } from "@/modules/strategy/infrastructure/in-memory-brief-repository";
import { InMemoryProposalRepository } from "@/modules/strategy/infrastructure/in-memory-proposal-repository";
import { InMemoryResultSnapshotRepository } from "@/modules/results/infrastructure/in-memory-result-snapshot-repository";
import { InMemoryReviewDecisionRepository } from "@/modules/review/infrastructure/in-memory-review-decision-repository";
import type { Proposal } from "@/modules/strategy/domain/proposal";
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

const NOW = "2026-02-01T00:00:00.000Z";

function makeDeps(generator: FakeProposalGenerator) {
  return {
    brands: new InMemoryBrandRepository(),
    audiences: new InMemoryAudienceRepository(),
    briefs: new InMemoryBriefRepository(),
    proposals: new InMemoryProposalRepository(),
    reviewDecisions: new InMemoryReviewDecisionRepository(),
    resultSnapshots: new InMemoryResultSnapshotRepository(),
    generator,
    clock: new FixedClock(NOW),
    ids: new SequentialIds("id"),
  };
}

function makeInReviewProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: "proposal-1",
    clientId: SCOPE.clientId,
    brandId: SCOPE.brandId,
    briefId: "brief-1",
    proposalThreadId: "brief-1",
    version: 1,
    parentVersion: null,
    state: "in_review",
    content: makeProposalContent(),
    sourceReferences: ["fact-1"],
    generation: { provider: "fake", model: "fake-model", generatedAt: "2026-01-15T00:00:00.000Z" },
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
    submittedAt: "2026-01-15T00:00:00.000Z",
    approvedAt: null,
    approvedBy: null,
    ...overrides,
  };
}

async function seed(deps: ReturnType<typeof makeDeps>, proposal: Proposal) {
  await deps.brands.save(makeBrand());
  await deps.audiences.save(makeAudience());
  await deps.briefs.save(makeBrief());
  await deps.proposals.save(proposal);
}

test("reviseProposal moves v1 to changes_requested, records the decision, and creates v2 as a draft", async () => {
  const revisedContent = makeProposalContent({
    campaignConcept: {
      ...makeProposalContent().campaignConcept,
      goal: "Aumentar el reconocimiento de marca entre tiendas (ajustado por feedback).",
    },
  });
  const generator = new FakeProposalGenerator({ ok: true, value: revisedContent });
  const deps = makeDeps(generator);
  const original = makeInReviewProposal();
  await seed(deps, original);

  const reviseProposal = createReviseProposal(deps);
  const result = await reviseProposal({
    scope: SCOPE,
    proposalId: original.id,
    feedback: "El hook de la semana 2 no conecta con el dueño de tienda.",
    reviewer: "Ana",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const revision = result.value;
  assert.equal(revision.version, 2);
  assert.equal(revision.parentVersion, 1);
  assert.equal(revision.state, "draft");
  assert.equal(revision.proposalThreadId, original.proposalThreadId);
  assert.deepEqual(revision.content, revisedContent);
  assert.deepEqual(revision.generation, { provider: "fake", model: "fake-model", generatedAt: NOW });

  // The prior version's content and identity are untouched by the revision — only its review state advances.
  const stillV1 = await deps.proposals.getById(SCOPE, original.id);
  assert.ok(stillV1);
  assert.equal(stillV1!.state, "changes_requested");
  assert.equal(stillV1!.version, 1);
  assert.deepEqual(stillV1!.content, original.content);

  const decisions = await deps.reviewDecisions.listByProposal(SCOPE, original.id);
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].decision, "changes_requested");
  assert.equal(decisions[0].reviewer, "Ana");
  assert.equal(decisions[0].feedback, "El hook de la semana 2 no conecta con el dueño de tienda.");
  assert.ok(revision.sourceReferences.includes(decisions[0].id));

  // The prompt sent to the generator carried the feedback and the previous content.
  assert.equal(generator.prompts.length, 1);
  assert.match(generator.prompts[0], /El hook de la semana 2 no conecta con el dueño de tienda\./);
});

test("reviseProposal returns 'unavailable' and persists nothing when the generator has no key", async () => {
  const generator = new FakeProposalGenerator({ ok: true, value: makeProposalContent() }, false);
  const deps = makeDeps(generator);
  const original = makeInReviewProposal();
  await seed(deps, original);

  const reviseProposal = createReviseProposal(deps);
  const result = await reviseProposal({ scope: SCOPE, proposalId: original.id, feedback: "Ajustar el CTA.", reviewer: "Ana" });

  assert.deepEqual(result, { ok: false, error: { kind: "unavailable" } });

  const stillV1 = await deps.proposals.getById(SCOPE, original.id);
  assert.equal(stillV1!.state, "in_review", "the state transition must not be persisted when generation cannot run");
  assert.deepEqual(await deps.reviewDecisions.list(SCOPE), []);
  assert.equal((await deps.proposals.list(SCOPE)).length, 1, "no new version should be created");
});

test("reviseProposal propagates invalid_output and persists nothing", async () => {
  const generator = new FakeProposalGenerator({
    ok: false,
    error: { kind: "invalid_output", issues: ["campaignConcept.goal: Required"] },
  });
  const deps = makeDeps(generator);
  const original = makeInReviewProposal();
  await seed(deps, original);

  const reviseProposal = createReviseProposal(deps);
  const result = await reviseProposal({ scope: SCOPE, proposalId: original.id, feedback: "Ajustar el CTA.", reviewer: "Ana" });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.deepEqual(result.error, { kind: "invalid_output", issues: ["campaignConcept.goal: Required"] });

  const stillV1 = await deps.proposals.getById(SCOPE, original.id);
  assert.equal(stillV1!.state, "in_review");
  assert.deepEqual(await deps.reviewDecisions.list(SCOPE), []);
  assert.equal((await deps.proposals.list(SCOPE)).length, 1);
});

test("reviseProposal rejects empty feedback without calling the generator", async () => {
  const generator = new FakeProposalGenerator({ ok: true, value: makeProposalContent() });
  const deps = makeDeps(generator);
  const original = makeInReviewProposal();
  await seed(deps, original);

  const reviseProposal = createReviseProposal(deps);
  const result = await reviseProposal({ scope: SCOPE, proposalId: original.id, feedback: "   ", reviewer: "Ana" });

  assert.deepEqual(result, { ok: false, error: { kind: "feedback_required" } });
  assert.equal(generator.prompts.length, 0);
  assert.equal((await deps.proposals.list(SCOPE)).length, 1);
});

test("reviseProposal rejects a proposal that is not in_review (e.g. already approved)", async () => {
  const generator = new FakeProposalGenerator({ ok: true, value: makeProposalContent() });
  const deps = makeDeps(generator);
  const approved = makeInReviewProposal({ state: "approved", approvedAt: NOW, approvedBy: "Ana" });
  await seed(deps, approved);

  const reviseProposal = createReviseProposal(deps);
  const result = await reviseProposal({ scope: SCOPE, proposalId: approved.id, feedback: "Ajustar el CTA.", reviewer: "Ana" });

  assert.deepEqual(result, {
    ok: false,
    error: { kind: "invalid_transition", from: "approved", action: "request_changes" },
  });
  assert.equal(generator.prompts.length, 0);
});

test("reviseProposal returns proposal_not_found for an unknown id", async () => {
  const generator = new FakeProposalGenerator({ ok: true, value: makeProposalContent() });
  const deps = makeDeps(generator);
  await seed(deps, makeInReviewProposal());

  const reviseProposal = createReviseProposal(deps);
  const result = await reviseProposal({ scope: SCOPE, proposalId: "missing", feedback: "x", reviewer: "Ana" });

  assert.deepEqual(result, { ok: false, error: { kind: "proposal_not_found" } });
});
