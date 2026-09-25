import assert from "node:assert/strict";
import { test } from "node:test";
import { createUpdateAudience } from "./update-audience";
import { InMemoryAudienceRepository } from "@/modules/strategy/infrastructure/in-memory-audience-repository";
import { SCOPE, makeAudience, FixedClock } from "./test-fixtures";

const NOW = "2026-02-01T00:00:00.000Z";

test("updateAudience saves pains, objections, and hypotheses", async () => {
  const audiences = new InMemoryAudienceRepository();
  await audiences.save(makeAudience());
  const updateAudience = createUpdateAudience({ audiences, clock: new FixedClock(NOW) });

  const result = await updateAudience({
    scope: SCOPE,
    audienceId: "audience-1",
    pains: [{ value: "Nuevo dolor confirmado por el dueño.", basis: "owner_input" }],
    objections: [{ value: "Objeción actualizada.", basis: "hypothesis" }],
    hypotheses: ["Nueva hipótesis."],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value.pains, [{ value: "Nuevo dolor confirmado por el dueño.", basis: "owner_input" }]);
  assert.equal(result.value.updatedAt, NOW);

  const persisted = await audiences.getById(SCOPE, "audience-1");
  assert.deepEqual(persisted, result.value);
});

test("updateAudience returns audience_not_found for an unknown audience", async () => {
  const audiences = new InMemoryAudienceRepository();
  const updateAudience = createUpdateAudience({ audiences, clock: new FixedClock(NOW) });

  const result = await updateAudience({ scope: SCOPE, audienceId: "missing", pains: [], objections: [], hypotheses: [] });

  assert.deepEqual(result, { ok: false, error: { kind: "audience_not_found" } });
});
