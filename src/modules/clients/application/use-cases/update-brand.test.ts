import assert from "node:assert/strict";
import { test } from "node:test";
import { createUpdateBrand } from "./update-brand";
import { InMemoryBrandRepository } from "@/modules/clients/infrastructure/in-memory-brand-repository";
import type { Brand } from "@/modules/clients/domain/brand";

const NOW = "2026-02-01T00:00:00.000Z";

class FixedClock {
  now(): string {
    return NOW;
  }
}

function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: "brand-1",
    clientId: "client-1",
    name: "Ventex",
    website: "https://www.ventex.app/",
    productFacts: [
      { id: "fact-1", statement: "Actualiza inventario en tiempo real.", provenance: "verified_website", approvedForAds: false },
    ],
    voice: "Cercano y profesional.",
    constraints: [],
    assets: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("updateBrand saves voice, constraints, assets, and product facts", async () => {
  const brands = new InMemoryBrandRepository();
  await brands.save(makeBrand());
  const updateBrand = createUpdateBrand({ brands, clock: new FixedClock() });

  const result = await updateBrand({
    clientId: "client-1",
    brandId: "brand-1",
    voice: "Directo y cercano.",
    constraints: ["No prometer resultados."],
    assets: ["Logo en PNG"],
    productFacts: [
      { id: "fact-1", statement: "Actualiza inventario en tiempo real.", provenance: "verified_website", approvedForAds: true },
    ],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.voice, "Directo y cercano.");
  assert.deepEqual(result.value.assets, ["Logo en PNG"]);
  assert.equal(result.value.productFacts[0].approvedForAds, true);
  assert.equal(result.value.updatedAt, NOW);

  const persisted = await brands.getById("client-1", "brand-1");
  assert.deepEqual(persisted, result.value);
});

test("updateBrand rejects approving a hypothesis fact for ads", async () => {
  const brands = new InMemoryBrandRepository();
  await brands.save(makeBrand());
  const updateBrand = createUpdateBrand({ brands, clock: new FixedClock() });

  const result = await updateBrand({
    clientId: "client-1",
    brandId: "brand-1",
    voice: "Directo y cercano.",
    constraints: [],
    assets: [],
    productFacts: [
      { id: "fact-2", statement: "Hipótesis sin confirmar.", provenance: "hypothesis", approvedForAds: true },
    ],
  });

  assert.deepEqual(result, { ok: false, error: { kind: "hypothesis_approved_for_ads", factId: "fact-2" } });
});

test("updateBrand returns brand_not_found for an unknown brand", async () => {
  const brands = new InMemoryBrandRepository();
  const updateBrand = createUpdateBrand({ brands, clock: new FixedClock() });

  const result = await updateBrand({
    clientId: "client-1",
    brandId: "missing",
    voice: "x",
    constraints: [],
    assets: [],
    productFacts: [],
  });

  assert.deepEqual(result, { ok: false, error: { kind: "brand_not_found" } });
});
