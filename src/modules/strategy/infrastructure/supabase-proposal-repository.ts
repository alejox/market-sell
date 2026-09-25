import type { ProposalRepository } from "@/modules/strategy/application/ports/proposal-repository";
import type { Proposal, ProposalGenerationMetadata, ProposalState } from "@/modules/strategy/domain/proposal";
import type { ProposalContent } from "@/modules/strategy/domain/proposal-content.schema";
import type { Scope } from "@/shared/scope";
import type { SupabaseClientProvider } from "@/shared/infrastructure/supabase/client-provider";
import { ScopedSupabaseRepository } from "@/shared/infrastructure/supabase/scoped-supabase-repository";

const TABLE = "proposals";

/** Row shape of `public.proposals` (see the workspace schema migration). */
interface ProposalRow {
  id: string;
  client_id: string;
  brand_id: string;
  brief_id: string;
  proposal_thread_id: string;
  version: number;
  parent_version: number | null;
  state: ProposalState;
  content: ProposalContent;
  source_references: string[];
  generation: ProposalGenerationMetadata | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
}

function fromRow(row: ProposalRow): Proposal {
  return {
    id: row.id,
    clientId: row.client_id,
    brandId: row.brand_id,
    briefId: row.brief_id,
    proposalThreadId: row.proposal_thread_id,
    version: row.version,
    parentVersion: row.parent_version,
    state: row.state,
    content: row.content,
    sourceReferences: row.source_references,
    generation: row.generation,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
  };
}

function toRow(proposal: Proposal): ProposalRow {
  return {
    id: proposal.id,
    client_id: proposal.clientId,
    brand_id: proposal.brandId,
    brief_id: proposal.briefId,
    proposal_thread_id: proposal.proposalThreadId,
    version: proposal.version,
    parent_version: proposal.parentVersion,
    state: proposal.state,
    content: proposal.content,
    source_references: proposal.sourceReferences,
    generation: proposal.generation,
    created_at: proposal.createdAt,
    updated_at: proposal.updatedAt,
    submitted_at: proposal.submittedAt,
    approved_at: proposal.approvedAt,
    approved_by: proposal.approvedBy,
  };
}

export class SupabaseProposalRepository implements ProposalRepository {
  private readonly repo: ScopedSupabaseRepository<ProposalRow, Proposal>;

  constructor(getClient: SupabaseClientProvider) {
    this.repo = new ScopedSupabaseRepository<ProposalRow, Proposal>(getClient, TABLE, fromRow, toRow);
  }

  list(scope: Scope): Promise<Proposal[]> {
    return this.repo.list(scope);
  }

  getById(scope: Scope, proposalId: string): Promise<Proposal | null> {
    return this.repo.getById(scope, proposalId);
  }

  listByThread(scope: Scope, proposalThreadId: string): Promise<Proposal[]> {
    return this.repo.listBy(scope, "proposal_thread_id", proposalThreadId);
  }

  save(proposal: Proposal): Promise<void> {
    return this.repo.save(proposal);
  }

  /** Never overwrites an existing proposal — used by import, safe under concurrent serverless instances. */
  insertIfAbsent(proposal: Proposal): Promise<boolean> {
    return this.repo.insertIfAbsent(proposal);
  }
}
