import assert from "node:assert/strict";
import { test } from "node:test";
import { createGenerateProposal } from "./generate-proposal";
import { InMemoryBrandRepository } from "@/modules/clients/infrastructure/in-memory-brand-repository";
import { InMemoryAudienceRepository } from "@/modules/strategy/infrastructure/in-memory-audience-repository";
import { InMemoryBriefRepository } from "@/modules/strategy/infrastructure/in-memory-brief-repository";
import { InMemoryProposalRepository } from "@/modules/strategy/infrastructure/in-memory-proposal-repository";
import { InMemoryResultSnapshotRepository } from "@/modules/results/infrastructure/in-memory-result-snapshot-repository";
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
    resultSnapshots: new InMemoryResultSnapshotRepository(),
    generator,
    clock: new FixedClock(NOW),
    ids: new SequentialIds("proposal"),
  };
}

async function seed(deps: ReturnType<typeof makeDeps>) {
  await deps.brands.save(makeBrand());
  await deps.audiences.save(makeAudience());
  await deps.briefs.save(makeBrief());
}

test("generateProposal persists a draft version 1 with generator metadata and source references", async () => {
  const content = makeProposalContent();
  const generator = new FakeProposalGenerator({ ok: true, value: content });
  const deps = makeDeps(generator);
  await seed(deps);

  const generateProposal = createGenerateProposal(deps);
  const result = await generateProposal({ scope: SCOPE, briefId: "brief-1" });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.state, "draft");
  assert.equal(result.value.version, 1);
  assert.equal(result.value.parentVersion, null);
  assert.equal(result.value.proposalThreadId, "brief-1");
  assert.deepEqual(result.value.generation, { provider: "fake", model: "fake-model", generatedAt: NOW });
  assert.deepEqual(result.value.sourceReferences, ["fact-1"]);

  const persisted = await deps.proposals.getById(SCOPE, result.value.id);
  assert.deepEqual(persisted, result.value);
});

test("generateProposal returns 'unavailable' and persists nothing when the generator has no key", async () => {
  const generator = new FakeProposalGenerator({ ok: true, value: makeProposalContent() }, false);
  const deps = makeDeps(generator);
  await seed(deps);

  const generateProposal = createGenerateProposal(deps);
  const result = await generateProposal({ scope: SCOPE, briefId: "brief-1" });

  assert.deepEqual(result, { ok: false, error: { kind: "unavailable" } });
  assert.deepEqual(await deps.proposals.list(SCOPE), []);
});

test("generateProposal propagates invalid_output and persists nothing", async () => {
  const generator = new FakeProposalGenerator({
    ok: false,
    error: { kind: "invalid_output", issues: ["contentPlan: expected 4 weeks"] },
  });
  const deps = makeDeps(generator);
  await seed(deps);

  const generateProposal = createGenerateProposal(deps);
  const result = await generateProposal({ scope: SCOPE, briefId: "brief-1" });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.deepEqual(result.error, { kind: "invalid_output", issues: ["contentPlan: expected 4 weeks"] });
  assert.deepEqual(await deps.proposals.list(SCOPE), []);
});

test("generateProposal fails with brief_not_found before calling the generator", async () => {
  const generator = new FakeProposalGenerator({ ok: true, value: makeProposalContent() });
  const deps = makeDeps(generator);
  await seed(deps);

  const generateProposal = createGenerateProposal(deps);
  const result = await generateProposal({ scope: SCOPE, briefId: "missing-brief" });

  assert.deepEqual(result, { ok: false, error: { kind: "brief_not_found" } });
  assert.equal(generator.prompts.length, 0);
});

test("generateProposal numbers a regenerated proposal as the next version in the thread", async () => {
  const generator = new FakeProposalGenerator({ ok: true, value: makeProposalContent() });
  const deps = makeDeps(generator);
  await seed(deps);

  const generateProposal = createGenerateProposal(deps);
  const first = await generateProposal({ scope: SCOPE, briefId: "brief-1" });
  assert.equal(first.ok, true);

  const second = await generateProposal({ scope: SCOPE, briefId: "brief-1" });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.value.version, 2);
  assert.equal(second.value.parentVersion, null);
});
