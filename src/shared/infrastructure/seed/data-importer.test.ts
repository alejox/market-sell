import assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryClientRepository } from "@/modules/clients/infrastructure/in-memory-client-repository";
import { InMemoryBrandRepository } from "@/modules/clients/infrastructure/in-memory-brand-repository";
import { InMemoryAudienceRepository } from "@/modules/strategy/infrastructure/in-memory-audience-repository";
import { InMemoryBriefRepository } from "@/modules/strategy/infrastructure/in-memory-brief-repository";
import { InMemoryProposalRepository } from "@/modules/strategy/infrastructure/in-memory-proposal-repository";
import { InMemoryReviewDecisionRepository } from "@/modules/review/infrastructure/in-memory-review-decision-repository";
import { InMemoryResultSnapshotRepository } from "@/modules/results/infrastructure/in-memory-result-snapshot-repository";
import type { Client } from "@/modules/clients/domain/client";
import type { Brand } from "@/modules/clients/domain/brand";
import type { ImportSourceData } from "./data-importer";
import { importWorkspaceData } from "./data-importer";

function makeTargets() {
  return {
    clients: new InMemoryClientRepository(),
    brands: new InMemoryBrandRepository(),
    audiences: new InMemoryAudienceRepository(),
    briefs: new InMemoryBriefRepository(),
    proposals: new InMemoryProposalRepository(),
    reviewDecisions: new InMemoryReviewDecisionRepository(),
    resultSnapshots: new InMemoryResultSnapshotRepository(),
  };
}

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "client-ventex-owner",
    name: "Marca propia",
    owner: "Owner",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: "brand-ventex",
    clientId: "client-ventex-owner",
    name: "Ventex",
    website: "https://www.ventex.app/",
    productFacts: [],
    voice: "Cercano",
    constraints: [],
    assets: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function emptySource(overrides: Partial<ImportSourceData> = {}): ImportSourceData {
  return {
    clients: [],
    brands: [],
    audiences: [],
    briefs: [],
    proposals: [],
    reviewDecisions: [],
    resultSnapshots: [],
    ...overrides,
  };
}

test("dry run reports what would be inserted and performs no writes at all", async () => {
  const targets = makeTargets();
  const source = emptySource({ clients: [makeClient()], brands: [makeBrand()] });

  const report = await importWorkspaceData(source, targets, { dryRun: true });

  assert.equal(report.dryRun, true);
  const clientsReport = report.collections.find((c) => c.collection === "clients");
  const brandsReport = report.collections.find((c) => c.collection === "brands");
  assert.deepEqual(clientsReport?.wouldInsert, ["client-ventex-owner"]);
  assert.deepEqual(brandsReport?.wouldInsert, ["brand-ventex"]);
  assert.deepEqual(clientsReport?.inserted, []);

  // No network/writes happened — the in-memory target is still empty.
  assert.deepEqual(await targets.clients.list(), []);
  assert.deepEqual(await targets.brands.listByClient("client-ventex-owner"), []);
});

test("a real (non-dry) run inserts rows that do not exist yet", async () => {
  const targets = makeTargets();
  const source = emptySource({ clients: [makeClient()], brands: [makeBrand()] });

  const report = await importWorkspaceData(source, targets, { dryRun: false });

  const clientsReport = report.collections.find((c) => c.collection === "clients");
  assert.deepEqual(clientsReport?.inserted, ["client-ventex-owner"]);
  assert.deepEqual(clientsReport?.wouldInsert, []);
  assert.equal((await targets.clients.list()).length, 1);
  assert.equal((await targets.brands.listByClient("client-ventex-owner")).length, 1);
});

test("skips (does not report as insertable, does not write) a row that already exists at the destination", async () => {
  const targets = makeTargets();
  await targets.clients.save(makeClient({ owner: "Ya existente" }));
  const source = emptySource({ clients: [makeClient({ owner: "Del archivo .data" })] });

  const dryRunReport = await importWorkspaceData(source, targets, { dryRun: true });
  const realRunReport = await importWorkspaceData(source, targets, { dryRun: false });

  assert.deepEqual(dryRunReport.collections[0]?.wouldInsert, []);
  assert.deepEqual(dryRunReport.collections[0]?.skippedExisting, ["client-ventex-owner"]);
  assert.deepEqual(realRunReport.collections[0]?.inserted, []);
  assert.deepEqual(realRunReport.collections[0]?.skippedExisting, ["client-ventex-owner"]);

  // The pre-existing row's content was never touched by the import.
  const client = await targets.clients.getById("client-ventex-owner");
  assert.equal(client?.owner, "Ya existente");
});

test("a rerun of a real import is idempotent: no duplicates, and nothing already imported is re-inserted", async () => {
  const targets = makeTargets();
  const source = emptySource({ clients: [makeClient()], brands: [makeBrand()] });

  const first = await importWorkspaceData(source, targets, { dryRun: false });
  const second = await importWorkspaceData(source, targets, { dryRun: false });

  assert.deepEqual(
    first.collections.map((c) => c.inserted),
    [["client-ventex-owner"], ["brand-ventex"], [], [], [], [], []],
  );
  assert.deepEqual(
    second.collections.map((c) => c.inserted),
    [[], [], [], [], [], [], []],
  );
  assert.deepEqual(second.collections[0]?.skippedExisting, ["client-ventex-owner"]);
  assert.equal((await targets.clients.list()).length, 1, "rerun must not duplicate the client");
  assert.equal((await targets.brands.listByClient("client-ventex-owner")).length, 1, "rerun must not duplicate the brand");
});
