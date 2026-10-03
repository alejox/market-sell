import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createAcceptInvitation,
  createCancelInvitation,
  createCheckInvitation,
  createCreateInvitation,
  createListTeam,
} from "./invitations";
import { InMemoryTeamRepository } from "@/modules/team/infrastructure/in-memory-team-repository";
import { NodeInvitationTokens } from "@/modules/team/infrastructure/node-invitation-tokens";

class MutableClock {
  constructor(private current: string) {}
  now(): string {
    return this.current;
  }
  set(value: string) {
    this.current = value;
  }
}
class SequentialIds {
  private count = 0;
  next(): string {
    this.count += 1;
    return `inv-${this.count}`;
  }
}

function setup() {
  const clock = new MutableClock("2026-10-03T12:00:00.000Z");
  const team = new InMemoryTeamRepository(() => clock.now(), { userId: "user-2", email: "ana@example.test" });
  const tokens = new NodeInvitationTokens();
  const deps = { team, tokens, clock, ids: new SequentialIds() };
  return {
    clock,
    team,
    tokens,
    createInvitation: createCreateInvitation(deps),
    listTeam: createListTeam(deps),
    cancelInvitation: createCancelInvitation(deps),
    checkInvitation: createCheckInvitation(deps),
    acceptInvitation: createAcceptInvitation(deps),
  };
}

test("createInvitation stores only the token hash and expires in seven days", async () => {
  const { team, tokens, createInvitation } = setup();

  const created = await createInvitation({ clientId: "client-1" });

  assert.equal(created.expiresAt, "2026-10-10T12:00:00.000Z");
  const [stored] = await team.listUnusedInvitations("client-1");
  assert.equal(stored.tokenHash, tokens.hash(created.token));
  assert.notEqual(stored.tokenHash, created.token);
  assert.equal(JSON.stringify(stored).includes(created.token), false);
});

test("every invitation gets a different, unguessably long token", async () => {
  const { createInvitation } = setup();
  const first = await createInvitation({ clientId: "client-1" });
  const second = await createInvitation({ clientId: "client-1" });
  assert.notEqual(first.token, second.token);
  assert.ok(first.token.length >= 43);
});

test("accepting a valid invitation adds the member once, and the link cannot be reused", async () => {
  const { createInvitation, acceptInvitation, listTeam, checkInvitation } = setup();
  const { token } = await createInvitation({ clientId: "client-1" });

  assert.equal(await checkInvitation({ token }), "valid");
  const first = await acceptInvitation({ token });
  assert.deepEqual(first, { ok: true, value: { clientId: "client-1" } });

  const team = await listTeam({ clientId: "client-1" });
  assert.deepEqual(team.members.map((member) => member.email), ["ana@example.test"]);
  assert.equal(team.pending.length, 0);

  assert.equal(await checkInvitation({ token }), "used");
  assert.deepEqual(await acceptInvitation({ token }), { ok: false, error: "used" });
});

test("an expired invitation is rejected and not listed as pending", async () => {
  const { clock, createInvitation, acceptInvitation, listTeam } = setup();
  const { token } = await createInvitation({ clientId: "client-1" });

  clock.set("2026-10-11T00:00:00.000Z");

  assert.deepEqual(await acceptInvitation({ token }), { ok: false, error: "expired" });
  assert.equal((await listTeam({ clientId: "client-1" })).pending.length, 0);
});

test("an unknown token is invalid", async () => {
  const { acceptInvitation, checkInvitation } = setup();
  assert.equal(await checkInvitation({ token: "nope" }), "invalid");
  assert.deepEqual(await acceptInvitation({ token: "nope" }), { ok: false, error: "invalid" });
});

test("cancelling removes a pending invitation but never touches another client's", async () => {
  const { createInvitation, cancelInvitation, listTeam } = setup();
  const mine = await createInvitation({ clientId: "client-1" });
  await createInvitation({ clientId: "client-2" });

  await cancelInvitation({ clientId: "client-2", invitationId: mine.invitationId });
  assert.equal((await listTeam({ clientId: "client-1" })).pending.length, 1);

  await cancelInvitation({ clientId: "client-1", invitationId: mine.invitationId });
  assert.equal((await listTeam({ clientId: "client-1" })).pending.length, 0);
  assert.equal((await listTeam({ clientId: "client-2" })).pending.length, 1);
});

test("the team repository has no way to remove a member", () => {
  const methods = Object.getOwnPropertyNames(InMemoryTeamRepository.prototype);
  assert.deepEqual(methods.filter((name) => /remove|delete|kick/i.test(name)), []);
});
