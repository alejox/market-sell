-- Workspace schema for the Ventex marketing strategist workspace.
--
-- Seven record types are persisted here, mirroring the domain interfaces in
-- src/modules/*/domain exactly:
--   clients            -> src/modules/clients/domain/client.ts
--   brands             -> src/modules/clients/domain/brand.ts
--   audiences          -> src/modules/strategy/domain/audience.ts
--   campaign_briefs    -> src/modules/strategy/domain/campaign-brief.ts
--   proposals          -> src/modules/strategy/domain/proposal.ts (+ proposal-content.schema.ts)
--   review_decisions   -> src/modules/review/domain/review-decision.ts
--   result_snapshots   -> src/modules/results/domain/result-snapshot.ts
--
-- This is a single-owner workspace (see AGENTS.md "Human-approval boundary"
-- and odd/tasks/supabase-production-persistence.md). `clients.owner_id` is
-- the verified Supabase auth user id (the allow-listed `SUPABASE_OWNER_ID`),
-- not the domain's `owner` display-name field. Every row below is reachable
-- only through row level security policies bound to that owner, verified at
-- both the `clients` root and every child table via composite foreign keys
-- and `exists` checks on the client/brand ancestry -- a query can never
-- cross into another client's or brand's rows, and (with a single owner
-- today) never into another owner's rows either.
--
-- Domain ids are opaque strings (see src/shared/infrastructure/uuid-id-generator.ts
-- for new ids and src/shared/infrastructure/seed/ventex-seed.ts for the
-- human-readable seeded ids such as "client-ventex-owner") -- not guaranteed
-- to be UUIDs -- so every primary key below is `text`, not `uuid`.

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------

create table public.clients (
  id text primary key,
  owner_id uuid not null references auth.users (id),
  name text not null,
  owner text not null,
  status text not null check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_owner_id_idx on public.clients (owner_id);

alter table public.clients enable row level security;

revoke all on public.clients from public;
revoke all on public.clients from anon;
grant select, insert, update, delete on public.clients to authenticated;

create policy "clients_select_own" on public.clients
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "clients_insert_own" on public.clients
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "clients_update_own" on public.clients
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "clients_delete_own" on public.clients
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- brands
-- ---------------------------------------------------------------------------

create table public.brands (
  id text primary key,
  client_id text not null references public.clients (id),
  name text not null,
  website text not null,
  -- ProductFact[] -- nested objects (id/statement/provenance/sourceUrl/approvedForAds).
  product_facts jsonb not null default '[]'::jsonb,
  voice text not null,
  constraints text[] not null default '{}',
  assets text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Lets child tables carry a composite (client_id, brand_id) foreign key so
  -- a child row can never point at a brand belonging to a different client.
  unique (client_id, id)
);

create index brands_client_id_idx on public.brands (client_id);

alter table public.brands enable row level security;

revoke all on public.brands from public;
revoke all on public.brands from anon;
grant select, insert, update, delete on public.brands to authenticated;

create policy "brands_select_own" on public.brands
  for select
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = brands.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "brands_insert_own" on public.brands
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.clients c
      where c.id = brands.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "brands_update_own" on public.brands
  for update
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = brands.client_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = brands.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "brands_delete_own" on public.brands
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = brands.client_id
        and c.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- audiences
-- ---------------------------------------------------------------------------

create table public.audiences (
  id text primary key,
  client_id text not null,
  brand_id text not null,
  segment_name text not null,
  geography text not null,
  -- Claim<string>[] -- nested {value, basis, factIds?}.
  pains jsonb not null default '[]'::jsonb,
  objections jsonb not null default '[]'::jsonb,
  hypotheses text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, brand_id) references public.brands (client_id, id),
  unique (client_id, brand_id, id)
);

create index audiences_client_brand_idx on public.audiences (client_id, brand_id);

alter table public.audiences enable row level security;

revoke all on public.audiences from public;
revoke all on public.audiences from anon;
grant select, insert, update, delete on public.audiences to authenticated;

create policy "audiences_select_own" on public.audiences
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = audiences.brand_id
        and b.client_id = audiences.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "audiences_insert_own" on public.audiences
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = audiences.brand_id
        and b.client_id = audiences.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "audiences_update_own" on public.audiences
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = audiences.brand_id
        and b.client_id = audiences.client_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = audiences.brand_id
        and b.client_id = audiences.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "audiences_delete_own" on public.audiences
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = audiences.brand_id
        and b.client_id = audiences.client_id
        and c.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- campaign_briefs
-- ---------------------------------------------------------------------------

create table public.campaign_briefs (
  id text primary key,
  client_id text not null,
  brand_id text not null,
  audience_id text not null,
  objective text not null,
  timeframe text not null,
  value_proposition text not null,
  -- BudgetRange | null -- {min, max, currency}; null unless the owner supplies it.
  budget_range jsonb,
  missing_information text[] not null default '{}',
  created_by text not null,
  status text not null check (status in ('draft', 'ready')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, brand_id) references public.brands (client_id, id),
  foreign key (client_id, brand_id, audience_id) references public.audiences (client_id, brand_id, id),
  unique (client_id, brand_id, id)
);

create index campaign_briefs_client_brand_idx on public.campaign_briefs (client_id, brand_id);
create index campaign_briefs_audience_idx on public.campaign_briefs (client_id, brand_id, audience_id);

alter table public.campaign_briefs enable row level security;

revoke all on public.campaign_briefs from public;
revoke all on public.campaign_briefs from anon;
grant select, insert, update, delete on public.campaign_briefs to authenticated;

create policy "campaign_briefs_select_own" on public.campaign_briefs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = campaign_briefs.brand_id
        and b.client_id = campaign_briefs.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "campaign_briefs_insert_own" on public.campaign_briefs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = campaign_briefs.brand_id
        and b.client_id = campaign_briefs.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "campaign_briefs_update_own" on public.campaign_briefs
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = campaign_briefs.brand_id
        and b.client_id = campaign_briefs.client_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = campaign_briefs.brand_id
        and b.client_id = campaign_briefs.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "campaign_briefs_delete_own" on public.campaign_briefs
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = campaign_briefs.brand_id
        and b.client_id = campaign_briefs.client_id
        and c.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- proposals
-- ---------------------------------------------------------------------------

create table public.proposals (
  id text primary key,
  client_id text not null,
  brand_id text not null,
  brief_id text not null,
  proposal_thread_id text not null,
  version integer not null,
  parent_version integer,
  state text not null check (state in ('draft', 'in_review', 'changes_requested', 'approved', 'archived')),
  -- ProposalContent -- the full nine-section generated document (see
  -- src/modules/strategy/domain/proposal-content.schema.ts); deeply nested,
  -- stored verbatim as jsonb.
  content jsonb not null,
  source_references text[] not null default '{}',
  -- ProposalGenerationMetadata | null -- {provider, model, generatedAt}.
  generation jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by text,
  foreign key (client_id, brand_id) references public.brands (client_id, id),
  foreign key (client_id, brand_id, brief_id) references public.campaign_briefs (client_id, brand_id, id),
  unique (client_id, brand_id, id)
);

create index proposals_client_brand_idx on public.proposals (client_id, brand_id);
create index proposals_thread_idx on public.proposals (client_id, brand_id, proposal_thread_id);
create index proposals_brief_idx on public.proposals (client_id, brand_id, brief_id);

alter table public.proposals enable row level security;

revoke all on public.proposals from public;
revoke all on public.proposals from anon;
grant select, insert, update, delete on public.proposals to authenticated;

create policy "proposals_select_own" on public.proposals
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = proposals.brand_id
        and b.client_id = proposals.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "proposals_insert_own" on public.proposals
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = proposals.brand_id
        and b.client_id = proposals.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "proposals_update_own" on public.proposals
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = proposals.brand_id
        and b.client_id = proposals.client_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = proposals.brand_id
        and b.client_id = proposals.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "proposals_delete_own" on public.proposals
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = proposals.brand_id
        and b.client_id = proposals.client_id
        and c.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- review_decisions
-- ---------------------------------------------------------------------------

create table public.review_decisions (
  id text primary key,
  client_id text not null,
  brand_id text not null,
  proposal_id text not null,
  proposal_thread_id text not null,
  version integer not null,
  decision text not null check (decision in ('approved', 'changes_requested')),
  reviewer text not null,
  -- Required for "changes_requested"; optional (null) otherwise -- enforced
  -- in the domain/application layer, not duplicated as a DB constraint.
  feedback text,
  decided_at timestamptz not null,
  foreign key (client_id, brand_id) references public.brands (client_id, id),
  foreign key (client_id, brand_id, proposal_id) references public.proposals (client_id, brand_id, id)
);

create index review_decisions_client_brand_idx on public.review_decisions (client_id, brand_id);
create index review_decisions_proposal_idx on public.review_decisions (client_id, brand_id, proposal_id);
create index review_decisions_thread_idx on public.review_decisions (client_id, brand_id, proposal_thread_id);

alter table public.review_decisions enable row level security;

revoke all on public.review_decisions from public;
revoke all on public.review_decisions from anon;
grant select, insert, update, delete on public.review_decisions to authenticated;

create policy "review_decisions_select_own" on public.review_decisions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = review_decisions.brand_id
        and b.client_id = review_decisions.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "review_decisions_insert_own" on public.review_decisions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = review_decisions.brand_id
        and b.client_id = review_decisions.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "review_decisions_update_own" on public.review_decisions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = review_decisions.brand_id
        and b.client_id = review_decisions.client_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = review_decisions.brand_id
        and b.client_id = review_decisions.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "review_decisions_delete_own" on public.review_decisions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = review_decisions.brand_id
        and b.client_id = review_decisions.client_id
        and c.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- result_snapshots
-- ---------------------------------------------------------------------------

create table public.result_snapshots (
  id text primary key,
  client_id text not null,
  brand_id text not null,
  proposal_id text not null,
  proposal_thread_id text not null,
  -- {from, to} -- ISO date strings, stored verbatim as the domain nests them.
  period jsonb not null,
  -- ResultMetric[] -- nested {name, value: number | string, unit?}.
  metrics jsonb not null default '[]'::jsonb,
  notes text not null,
  source text not null check (source in ('manual_owner_entry', 'manual_meta_export', 'manual_other')),
  recorded_by text not null,
  recorded_at timestamptz not null,
  foreign key (client_id, brand_id) references public.brands (client_id, id),
  foreign key (client_id, brand_id, proposal_id) references public.proposals (client_id, brand_id, id)
);

create index result_snapshots_client_brand_idx on public.result_snapshots (client_id, brand_id);
create index result_snapshots_proposal_idx on public.result_snapshots (client_id, brand_id, proposal_id);
create index result_snapshots_thread_idx on public.result_snapshots (client_id, brand_id, proposal_thread_id);

alter table public.result_snapshots enable row level security;

revoke all on public.result_snapshots from public;
revoke all on public.result_snapshots from anon;
grant select, insert, update, delete on public.result_snapshots to authenticated;

create policy "result_snapshots_select_own" on public.result_snapshots
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = result_snapshots.brand_id
        and b.client_id = result_snapshots.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "result_snapshots_insert_own" on public.result_snapshots
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = result_snapshots.brand_id
        and b.client_id = result_snapshots.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "result_snapshots_update_own" on public.result_snapshots
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = result_snapshots.brand_id
        and b.client_id = result_snapshots.client_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = result_snapshots.brand_id
        and b.client_id = result_snapshots.client_id
        and c.owner_id = (select auth.uid())
    )
  );

create policy "result_snapshots_delete_own" on public.result_snapshots
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = result_snapshots.brand_id
        and b.client_id = result_snapshots.client_id
        and c.owner_id = (select auth.uid())
    )
  );
