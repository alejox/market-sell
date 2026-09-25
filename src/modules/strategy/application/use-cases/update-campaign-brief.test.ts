import assert from "node:assert/strict";
import { test } from "node:test";
import { createUpdateCampaignBrief } from "./update-campaign-brief";
import { InMemoryBriefRepository } from "@/modules/strategy/infrastructure/in-memory-brief-repository";
import { SCOPE, makeBrief, FixedClock } from "./test-fixtures";

const NOW = "2026-02-01T00:00:00.000Z";

test("updateCampaignBrief saves objective, timeframe, value proposition, budget range, and missing information", async () => {
  const briefs = new InMemoryBriefRepository();
  await briefs.save(makeBrief());
  const updateCampaignBrief = createUpdateCampaignBrief({ briefs, clock: new FixedClock(NOW) });

  const result = await updateCampaignBrief({
    scope: SCOPE,
    briefId: "brief-1",
    objective: "Nuevo objetivo.",
    timeframe: "6 semanas",
    valueProposition: "Nueva propuesta de valor.",
    budgetRange: { min: 500000, max: 1000000, currency: "COP" },
    missingInformation: ["Confirmar presupuesto."],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.objective, "Nuevo objetivo.");
  assert.deepEqual(result.value.budgetRange, { min: 500000, max: 1000000, currency: "COP" });
  assert.equal(result.value.updatedAt, NOW);

  const persisted = await briefs.getById(SCOPE, "brief-1");
  assert.deepEqual(persisted, result.value);
});

test("updateCampaignBrief returns brief_not_found for an unknown brief", async () => {
  const briefs = new InMemoryBriefRepository();
  const updateCampaignBrief = createUpdateCampaignBrief({ briefs, clock: new FixedClock(NOW) });

  const result = await updateCampaignBrief({
    scope: SCOPE,
    briefId: "missing",
    objective: "x",
    timeframe: "x",
    valueProposition: "x",
    budgetRange: null,
    missingInformation: [],
  });

  assert.deepEqual(result, { ok: false, error: { kind: "brief_not_found" } });
});
