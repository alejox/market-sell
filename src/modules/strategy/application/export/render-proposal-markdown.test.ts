import assert from "node:assert/strict";
import { test } from "node:test";
import { renderProposalMarkdown } from "./render-proposal-markdown";
import { makeBrand, makeProposalContent, SCOPE } from "@/modules/strategy/application/use-cases/test-fixtures";
import type { Proposal } from "@/modules/strategy/domain/proposal";

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: "proposal-1",
    clientId: SCOPE.clientId,
    brandId: SCOPE.brandId,
    briefId: "brief-1",
    proposalThreadId: "brief-1",
    version: 1,
    parentVersion: null,
    state: "draft",
    content: makeProposalContent(),
    sourceReferences: ["fact-1"],
    generation: { provider: "gemini", model: "gemini-3.8-flash", generatedAt: "2026-01-15T00:00:00.000Z" },
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
    ...overrides,
  };
}

const CONTEXT = {
  brandName: "Ventex",
  audienceSegmentName: "Tiendas / comercio minorista",
  productFacts: makeBrand().productFacts,
};

test("renderProposalMarkdown marks an unapproved proposal prominently as a draft", () => {
  const markdown = renderProposalMarkdown(makeProposal({ state: "in_review" }), CONTEXT);

  assert.match(markdown, /BORRADOR — NO APROBADO/);
  assert.doesNotMatch(markdown, /\*\*Aprobado por:\*\*/);
  assert.match(markdown, /## 1\. Resumen del brief/);
  assert.match(markdown, /## 9\. Riesgos y preguntas abiertas/);
});

test("renderProposalMarkdown states the approver and timestamp for an approved proposal, without the draft marker", () => {
  const markdown = renderProposalMarkdown(
    makeProposal({ state: "approved", approvedBy: "Ana", approvedAt: "2026-01-20T00:00:00.000Z" }),
    CONTEXT,
  );

  assert.doesNotMatch(markdown, /BORRADOR — NO APROBADO/);
  assert.match(markdown, /\*\*Aprobado por:\*\* Ana el 2026-01-20T00:00:00\.000Z/);
});

test("renderProposalMarkdown resolves cited fact ids to their statements and labels claim basis", () => {
  const markdown = renderProposalMarkdown(makeProposal(), CONTEXT);

  assert.match(markdown, /Ventex actualiza el inventario en tiempo real\./);
  assert.match(markdown, /\[Hecho\]/);
  assert.match(markdown, /\[Hipótesis\]/);
  assert.match(markdown, /## Referencias de origen/);
});

test("renderProposalMarkdown includes brand and audience names in the title", () => {
  const markdown = renderProposalMarkdown(makeProposal(), CONTEXT);

  assert.match(markdown, /^# Propuesta de campaña — Ventex · Tiendas \/ comercio minorista/);
});
