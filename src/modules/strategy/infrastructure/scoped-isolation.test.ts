import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { JsonBriefRepository } from "./json-brief-repository";
import { JsonProposalRepository } from "./json-proposal-repository";
import type { CampaignBrief } from "@/modules/strategy/domain/campaign-brief";
import type { Proposal } from "@/modules/strategy/domain/proposal";
import type { ProposalContent } from "@/modules/strategy/domain/proposal-content.schema";

const cleanupDirs: string[] = [];
after(async () => {
  await Promise.all(cleanupDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ventex-isolation-"));
  cleanupDirs.push(dir);
  return dir;
}

const SCOPE_A = { clientId: "client-1", brandId: "brand-a" };
const SCOPE_B = { clientId: "client-1", brandId: "brand-b" };

function makeBrief(overrides: Partial<CampaignBrief>): CampaignBrief {
  return {
    id: "brief-a",
    clientId: SCOPE_A.clientId,
    brandId: SCOPE_A.brandId,
    audienceId: "audience-a",
    objective: "Objetivo de prueba",
    timeframe: "4 semanas",
    valueProposition: "Propuesta de valor de prueba",
    budgetRange: null,
    missingInformation: [],
    createdBy: "Owner",
    status: "draft",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeProposal(overrides: Partial<Proposal>): Proposal {
  return {
    id: "proposal-a",
    clientId: SCOPE_A.clientId,
    brandId: SCOPE_A.brandId,
    briefId: "brief-a",
    proposalThreadId: "thread-a",
    version: 1,
    parentVersion: null,
    state: "draft",
    content: {} as ProposalContent,
    sourceReferences: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
    ...overrides,
  };
}

test("brand B cannot read brand A's briefs, even with the exact id", async () => {
  const dir = await makeTempDir();
  const repo = new JsonBriefRepository(join(dir, "briefs.json"));
  await repo.save(makeBrief({}));

  assert.deepEqual(await repo.list(SCOPE_B), []);
  assert.equal(await repo.getById(SCOPE_B, "brief-a"), null);
  assert.equal(await repo.getByAudience(SCOPE_B, "audience-a"), null);

  const ownList = await repo.list(SCOPE_A);
  assert.equal(ownList.length, 1);
});

test("brand B cannot read brand A's proposals, even with the exact id or thread id", async () => {
  const dir = await makeTempDir();
  const repo = new JsonProposalRepository(join(dir, "proposals.json"));
  await repo.save(makeProposal({}));

  assert.deepEqual(await repo.list(SCOPE_B), []);
  assert.equal(await repo.getById(SCOPE_B, "proposal-a"), null);
  assert.deepEqual(await repo.listByThread(SCOPE_B, "thread-a"), []);

  assert.equal((await repo.getById(SCOPE_A, "proposal-a"))?.id, "proposal-a");
});

test("same clientId with a different brandId is still isolated", async () => {
  const dir = await makeTempDir();
  const repo = new JsonBriefRepository(join(dir, "briefs.json"));
  await repo.save(makeBrief({ id: "brief-a1" }));
  await repo.save(makeBrief({ id: "brief-b1", brandId: SCOPE_B.brandId }));

  const listA = await repo.list(SCOPE_A);
  const listB = await repo.list(SCOPE_B);
  assert.deepEqual(
    listA.map((b) => b.id),
    ["brief-a1"],
  );
  assert.deepEqual(
    listB.map((b) => b.id),
    ["brief-b1"],
  );
});
