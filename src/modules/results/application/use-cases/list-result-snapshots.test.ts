import assert from "node:assert/strict";
import { test } from "node:test";
import { createListResultSnapshots } from "./list-result-snapshots";
import { InMemoryResultSnapshotRepository } from "@/modules/results/infrastructure/in-memory-result-snapshot-repository";
import type { ResultSnapshot } from "@/modules/results/domain/result-snapshot";

const SCOPE = { clientId: "client-1", brandId: "brand-1" };

function makeSnapshot(overrides: Partial<ResultSnapshot>): ResultSnapshot {
  return {
    id: "snapshot-1",
    clientId: SCOPE.clientId,
    brandId: SCOPE.brandId,
    proposalId: "proposal-1",
    proposalThreadId: "brief-1",
    period: { from: "2026-01-01", to: "2026-01-31" },
    metrics: [{ name: "Alcance", value: 1000 }],
    notes: "",
    source: "manual_owner_entry",
    recordedBy: "Owner",
    recordedAt: "2026-02-01T00:00:00.000Z",
    ...overrides,
  };
}

test("listResultSnapshots returns snapshots for one thread only, oldest first", async () => {
  const resultSnapshots = new InMemoryResultSnapshotRepository();
  await resultSnapshots.save(makeSnapshot({ id: "snapshot-2", recordedAt: "2026-03-01T00:00:00.000Z" }));
  await resultSnapshots.save(makeSnapshot({ id: "snapshot-1", recordedAt: "2026-02-01T00:00:00.000Z" }));
  await resultSnapshots.save(makeSnapshot({ id: "snapshot-other-thread", proposalThreadId: "brief-2" }));

  const listResultSnapshots = createListResultSnapshots({ resultSnapshots });
  const results = await listResultSnapshots({ scope: SCOPE, proposalThreadId: "brief-1" });

  assert.deepEqual(
    results.map((s) => s.id),
    ["snapshot-1", "snapshot-2"],
  );
});
