import assert from "node:assert/strict";
import { test } from "node:test";
import { createListPeople, createUpdateProfile } from "./people";
import { InMemoryProfileRepository } from "@/modules/team/infrastructure/in-memory-profile-repository";
import type { TeamMember } from "@/modules/team/domain/team";

const members: TeamMember[] = [
  { clientId: "client-1", userId: "u-luis", email: "luis@example.test", joinedAt: "2026-10-01T00:00:00.000Z" },
  { clientId: "client-1", userId: "u-ana", email: "ana.perez@example.test", joinedAt: "2026-10-02T00:00:00.000Z" },
  { clientId: "client-2", userId: "u-otra", email: "otra@example.test", joinedAt: "2026-10-02T00:00:00.000Z" },
];

const team = { listMembers: async (clientId: string) => members.filter((m) => m.clientId === clientId) };
const clock = { now: () => "2026-10-05T10:00:00.000Z" };

test("listPeople merges members with profiles and falls back to the email for a missing profile", async () => {
  const profiles = new InMemoryProfileRepository();
  await profiles.save({ clientId: "client-1", userId: "u-ana", displayName: "Ana Pérez", jobTitle: "Diseñadora", updatedAt: clock.now() });
  const listPeople = createListPeople({ team, profiles });

  const people = await listPeople({ clientId: "client-1" });

  assert.deepEqual(people, [
    { userId: "u-ana", displayName: "Ana Pérez", jobTitle: "Diseñadora" },
    { userId: "u-luis", displayName: "luis", jobTitle: null },
  ]);
});

test("listPeople never includes another client's members and exposes no email", async () => {
  const listPeople = createListPeople({ team, profiles: new InMemoryProfileRepository() });
  const people = await listPeople({ clientId: "client-1" });
  assert.equal(people.some((p) => p.userId === "u-otra"), false);
  assert.equal(JSON.stringify(people).includes("@"), false);
});

test("updateProfile saves the normalized fields for the given user", async () => {
  const profiles = new InMemoryProfileRepository();
  const updateProfile = createUpdateProfile({ profiles, clock });

  const result = await updateProfile({ clientId: "client-1", userId: "u-ana", displayName: "  Ana  Pérez ", jobTitle: " QA " });

  assert.ok(result.ok);
  assert.deepEqual(await profiles.getByUser("client-1", "u-ana"), {
    clientId: "client-1",
    userId: "u-ana",
    displayName: "Ana Pérez",
    jobTitle: "QA",
    updatedAt: "2026-10-05T10:00:00.000Z",
  });
});

test("updateProfile rejects invalid input without saving", async () => {
  const profiles = new InMemoryProfileRepository();
  const updateProfile = createUpdateProfile({ profiles, clock });

  assert.deepEqual(await updateProfile({ clientId: "client-1", userId: "u-ana", displayName: " " }), {
    ok: false,
    error: { kind: "display_name_required" },
  });
  assert.equal(await profiles.getByUser("client-1", "u-ana"), null);
});
