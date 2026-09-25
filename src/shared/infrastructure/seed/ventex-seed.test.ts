import assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryClientRepository } from "@/modules/clients/infrastructure/in-memory-client-repository";
import { InMemoryBrandRepository } from "@/modules/clients/infrastructure/in-memory-brand-repository";
import { InMemoryAudienceRepository } from "@/modules/strategy/infrastructure/in-memory-audience-repository";
import { InMemoryBriefRepository } from "@/modules/strategy/infrastructure/in-memory-brief-repository";
import { VENTEX_BRAND_ID, VENTEX_CLIENT_ID, ensureVentexSeed } from "./ventex-seed";

function makeRepos() {
  return {
    clients: new InMemoryClientRepository(),
    brands: new InMemoryBrandRepository(),
    audiences: new InMemoryAudienceRepository(),
    briefs: new InMemoryBriefRepository(),
  };
}

test("seeds the Ventex client, brand, two audiences, and two briefs on first call", async () => {
  const repos = makeRepos();
  const result = await ensureVentexSeed(repos, { owner: "Ana", now: () => "2026-01-01T00:00:00.000Z" });

  assert.equal(result.seeded, true);
  assert.equal(result.clientId, VENTEX_CLIENT_ID);
  assert.equal(result.brandId, VENTEX_BRAND_ID);

  const clients = await repos.clients.list();
  assert.equal(clients.length, 1);
  assert.equal(clients[0].name, "Marca propia");
  assert.equal(clients[0].owner, "Ana");

  const brands = await repos.brands.listByClient(VENTEX_CLIENT_ID);
  assert.equal(brands.length, 1);
  assert.equal(brands[0].name, "Ventex");
  assert.ok(brands[0].productFacts.length > 0);
  assert.ok(brands[0].productFacts.every((fact) => fact.provenance === "verified_website"));
  assert.ok(brands[0].productFacts.every((fact) => fact.approvedForAds === false));

  const scope = { clientId: VENTEX_CLIENT_ID, brandId: VENTEX_BRAND_ID };
  const audiences = await repos.audiences.list(scope);
  assert.equal(audiences.length, 2);

  const briefs = await repos.briefs.list(scope);
  assert.equal(briefs.length, 2);
  assert.ok(briefs.every((brief) => brief.budgetRange === null));
  assert.ok(briefs.every((brief) => brief.missingInformation.length > 0));
});

test("is idempotent: a second call does not duplicate or overwrite data", async () => {
  const repos = makeRepos();
  await ensureVentexSeed(repos, { owner: "Ana", now: () => "2026-01-01T00:00:00.000Z" });
  const second = await ensureVentexSeed(repos, { owner: "Otro nombre", now: () => "2026-02-01T00:00:00.000Z" });

  assert.equal(second.seeded, false);

  const clients = await repos.clients.list();
  assert.equal(clients.length, 1);
  assert.equal(clients[0].owner, "Ana", "second call must not overwrite the existing client");

  const scope = { clientId: VENTEX_CLIENT_ID, brandId: VENTEX_BRAND_ID };
  assert.equal((await repos.audiences.list(scope)).length, 2);
  assert.equal((await repos.briefs.list(scope)).length, 2);
});
