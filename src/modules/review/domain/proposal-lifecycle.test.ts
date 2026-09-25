import assert from "node:assert/strict";
import { test } from "node:test";
import { approve, archive, createRevision, requestChanges, submitForReview } from "./proposal-lifecycle";
import type { Proposal } from "@/modules/strategy/domain/proposal";
import type { ProposalContent } from "@/modules/strategy/domain/proposal-content.schema";

const minimalContent = {} as ProposalContent;

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: "proposal-1",
    clientId: "client-1",
    brandId: "brand-1",
    briefId: "brief-1",
    proposalThreadId: "thread-1",
    version: 1,
    parentVersion: null,
    state: "draft",
    content: minimalContent,
    sourceReferences: [],
    generation: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
    ...overrides,
  };
}

test("submitForReview moves draft to in_review", () => {
  const proposal = makeProposal();
  const result = submitForReview(proposal, "2026-01-02T00:00:00.000Z");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.state, "in_review");
    assert.equal(result.value.submittedAt, "2026-01-02T00:00:00.000Z");
  }
});

test("submitForReview rejects a non-draft proposal", () => {
  const proposal = makeProposal({ state: "approved" });
  const result = submitForReview(proposal, "2026-01-02T00:00:00.000Z");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(result.error, {
      kind: "invalid_transition",
      from: "approved",
      action: "submit_for_review",
    });
  }
});

test("approve records reviewer, timestamp, and keeps the version", () => {
  const proposal = makeProposal({ state: "in_review", version: 3 });
  const result = approve(proposal, "Ana", "2026-01-03T00:00:00.000Z");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.state, "approved");
    assert.equal(result.value.approvedBy, "Ana");
    assert.equal(result.value.approvedAt, "2026-01-03T00:00:00.000Z");
    assert.equal(result.value.version, 3);
  }
});

test("approve rejects a proposal that is not in_review", () => {
  const proposal = makeProposal({ state: "draft" });
  const result = approve(proposal, "Ana", "2026-01-03T00:00:00.000Z");
  assert.equal(result.ok, false);
});

test("requestChanges requires non-empty feedback", () => {
  const proposal = makeProposal({ state: "in_review" });
  const result = requestChanges(proposal, "Ana", "   ", "2026-01-03T00:00:00.000Z");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(result.error, { kind: "feedback_required" });
  }
});

test("requestChanges moves in_review to changes_requested with feedback", () => {
  const proposal = makeProposal({ state: "in_review" });
  const result = requestChanges(proposal, "Ana", "Ajustar el hook de la semana 2", "2026-01-03T00:00:00.000Z");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.state, "changes_requested");
  }
});

test("archive rejects an already archived proposal", () => {
  const proposal = makeProposal({ state: "archived" });
  const result = archive(proposal, "2026-01-04T00:00:00.000Z");
  assert.equal(result.ok, false);
});

test("archive works from draft, in_review, changes_requested, and approved", () => {
  for (const state of ["draft", "in_review", "changes_requested", "approved"] as const) {
    const result = archive(makeProposal({ state }), "2026-01-04T00:00:00.000Z");
    assert.equal(result.ok, true, `expected archive to succeed from ${state}`);
  }
});

test("createRevision never mutates the approved source proposal", () => {
  const approved = makeProposal({ state: "approved", version: 2, approvedBy: "Ana", approvedAt: "x" });
  const frozen = { ...approved };
  const result = createRevision(approved, "proposal-2", minimalContent, [], "2026-01-05T00:00:00.000Z");

  assert.equal(result.ok, true);
  assert.deepEqual(approved, frozen, "source proposal object must be untouched");
  if (result.ok) {
    const revision = result.value;
    assert.notEqual(revision, approved);
    assert.equal(revision.id, "proposal-2");
    assert.equal(revision.version, 3);
    assert.equal(revision.parentVersion, 2);
    assert.equal(revision.state, "draft");
    assert.equal(revision.approvedBy, null);
    assert.equal(revision.approvedAt, null);
  }
});

test("createRevision is only valid from changes_requested or approved", () => {
  for (const state of ["draft", "in_review", "archived"] as const) {
    const result = createRevision(makeProposal({ state }), "proposal-2", minimalContent, [], "now");
    assert.equal(result.ok, false, `expected createRevision to fail from ${state}`);
  }
  for (const state of ["changes_requested", "approved"] as const) {
    const result = createRevision(makeProposal({ state }), "proposal-2", minimalContent, [], "now");
    assert.equal(result.ok, true, `expected createRevision to succeed from ${state}`);
  }
});
