-- Team access for the Ventex marketing workspace.
--
--   team_members      -> src/modules/team/domain/team.ts (TeamMember)
--   team_invitations  -> src/modules/team/domain/team.ts (Invitation)
--
-- Until now every policy compared clients.owner_id with auth.uid(), so only
-- the single owner could read or write anything. Invited people are admins
-- with the same access as the owner, so every "owner" check below becomes
-- public.is_client_member(client_id): the client's owner OR a row in
-- team_members. Creating and deleting clients stays owner-only.
--
-- Invitations are single-use links. Only the SHA-256 hash of the token is
-- stored; accept_invitation() is the only way a membership row is created, so
-- nobody can add themselves to a client without a valid, unexpired,
-- unused token. There is deliberately no way to remove a member from the app.

create table public.team_members (
  client_id text not null references public.clients (id),
  user_id uuid not null references auth.users (id),
  email text not null,
  invited_by uuid references auth.users (id),
  joined_at timestamptz not null default now(),
  primary key (client_id, user_id)
);

create index team_members_user_id_idx on public.team_members (user_id);

create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.clients (id),
  token_hash text not null unique,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users (id),
  check (expires_at > created_at)
);

create index team_invitations_client_id_idx on public.team_invitations (client_id);

-- The owner is listed as a member too, so the team page shows everyone.
insert into public.team_members (client_id, user_id, email)
select c.id, c.owner_id, coalesce(u.email, '')
from public.clients c
join auth.users u on u.id = c.owner_id
on conflict do nothing;

-- Membership check used by every policy. SECURITY DEFINER so it can read
-- team_members without re-entering that table's own policies.
create function public.is_client_member(p_client_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clients c
    where c.id = p_client_id and c.owner_id = (select auth.uid())
  ) or exists (
    select 1 from public.team_members m
    where m.client_id = p_client_id and m.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_client_member(text) from public;
revoke all on function public.is_client_member(text) from anon;
grant execute on function public.is_client_member(text) to authenticated;

-- What an invitation link would do right now, without revealing anything else.
-- Callable before sign-in so the invitation page can say "invalid" up front.
create function public.invitation_status(p_token_hash text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select case
       when i.used_at is not null then 'used'
       when i.expires_at <= now() then 'expired'
       else 'valid'
     end
     from public.team_invitations i
     where i.token_hash = p_token_hash),
    'invalid'
  );
$$;

revoke all on function public.invitation_status(text) from public;
grant execute on function public.invitation_status(text) to anon, authenticated;

-- Consumes an invitation for the signed-in user and returns the client id.
create function public.accept_invitation(p_token_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_invitation public.team_invitations;
  v_email text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_invitation
  from public.team_invitations
  where token_hash = p_token_hash
  for update;

  if not found then
    raise exception 'invitation_invalid';
  end if;
  if v_invitation.used_at is not null then
    raise exception 'invitation_used';
  end if;
  if v_invitation.expires_at <= now() then
    raise exception 'invitation_expired';
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;

  insert into public.team_members (client_id, user_id, email, invited_by)
  values (v_invitation.client_id, v_uid, coalesce(v_email, ''), v_invitation.created_by)
  on conflict do nothing;

  update public.team_invitations
  set used_at = now(), used_by = v_uid
  where id = v_invitation.id;

  return v_invitation.client_id;
end;
$$;

revoke all on function public.accept_invitation(text) from public;
revoke all on function public.accept_invitation(text) from anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- team_members: members can read their team; rows are only ever created by
-- accept_invitation(), so there is no insert/update/delete policy at all.
alter table public.team_members enable row level security;

revoke all on public.team_members from public;
revoke all on public.team_members from anon;
grant select on public.team_members to authenticated;

create policy "team_members_select_member" on public.team_members
  for select
  to authenticated
  using (public.is_client_member(client_id));

-- team_invitations: members create and read links, and can cancel one that
-- has not been used. Nothing updates a row except accept_invitation().
alter table public.team_invitations enable row level security;

revoke all on public.team_invitations from public;
revoke all on public.team_invitations from anon;
grant select, insert, delete on public.team_invitations to authenticated;

create policy "team_invitations_select_member" on public.team_invitations
  for select
  to authenticated
  using (public.is_client_member(client_id));

create policy "team_invitations_insert_member" on public.team_invitations
  for insert
  to authenticated
  with check (
    public.is_client_member(client_id)
    and created_by = (select auth.uid())
    and used_at is null
  );

create policy "team_invitations_delete_unused" on public.team_invitations
  for delete
  to authenticated
  using (public.is_client_member(client_id) and used_at is null);

-- Clients: members can read the client; only the owner can change or delete it.
drop policy "clients_select_own" on public.clients;
create policy "clients_select_own" on public.clients
  for select
  to authenticated
  using (public.is_client_member(id));

-- Every scoped table: owner check -> membership check. Same names, same
-- operations, same client/brand scoping; only the ownership test changes.

drop policy "brands_select_own" on public.brands;
create policy "brands_select_own" on public.brands
  for select
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = brands.client_id
        and public.is_client_member(c.id)
    )
  );

drop policy "brands_insert_own" on public.brands;
create policy "brands_insert_own" on public.brands
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.clients c
      where c.id = brands.client_id
        and public.is_client_member(c.id)
    )
  );

drop policy "brands_update_own" on public.brands;
create policy "brands_update_own" on public.brands
  for update
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = brands.client_id
        and public.is_client_member(c.id)
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = brands.client_id
        and public.is_client_member(c.id)
    )
  );

drop policy "brands_delete_own" on public.brands;
create policy "brands_delete_own" on public.brands
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = brands.client_id
        and public.is_client_member(c.id)
    )
  );

drop policy "audiences_select_own" on public.audiences;
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
        and public.is_client_member(c.id)
    )
  );

drop policy "audiences_insert_own" on public.audiences;
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
        and public.is_client_member(c.id)
    )
  );

drop policy "audiences_update_own" on public.audiences;
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
        and public.is_client_member(c.id)
    )
  )
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = audiences.brand_id
        and b.client_id = audiences.client_id
        and public.is_client_member(c.id)
    )
  );

drop policy "audiences_delete_own" on public.audiences;
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
        and public.is_client_member(c.id)
    )
  );

drop policy "campaign_briefs_select_own" on public.campaign_briefs;
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
        and public.is_client_member(c.id)
    )
  );

drop policy "campaign_briefs_insert_own" on public.campaign_briefs;
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
        and public.is_client_member(c.id)
    )
  );

drop policy "campaign_briefs_update_own" on public.campaign_briefs;
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
        and public.is_client_member(c.id)
    )
  )
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = campaign_briefs.brand_id
        and b.client_id = campaign_briefs.client_id
        and public.is_client_member(c.id)
    )
  );

drop policy "campaign_briefs_delete_own" on public.campaign_briefs;
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
        and public.is_client_member(c.id)
    )
  );

drop policy "proposals_select_own" on public.proposals;
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
        and public.is_client_member(c.id)
    )
  );

drop policy "proposals_insert_own" on public.proposals;
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
        and public.is_client_member(c.id)
    )
  );

drop policy "proposals_update_own" on public.proposals;
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
        and public.is_client_member(c.id)
    )
  )
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = proposals.brand_id
        and b.client_id = proposals.client_id
        and public.is_client_member(c.id)
    )
  );

drop policy "proposals_delete_own" on public.proposals;
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
        and public.is_client_member(c.id)
    )
  );

drop policy "review_decisions_select_own" on public.review_decisions;
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
        and public.is_client_member(c.id)
    )
  );

drop policy "review_decisions_insert_own" on public.review_decisions;
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
        and public.is_client_member(c.id)
    )
  );

drop policy "review_decisions_update_own" on public.review_decisions;
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
        and public.is_client_member(c.id)
    )
  )
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = review_decisions.brand_id
        and b.client_id = review_decisions.client_id
        and public.is_client_member(c.id)
    )
  );

drop policy "review_decisions_delete_own" on public.review_decisions;
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
        and public.is_client_member(c.id)
    )
  );

drop policy "result_snapshots_select_own" on public.result_snapshots;
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
        and public.is_client_member(c.id)
    )
  );

drop policy "result_snapshots_insert_own" on public.result_snapshots;
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
        and public.is_client_member(c.id)
    )
  );

drop policy "result_snapshots_update_own" on public.result_snapshots;
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
        and public.is_client_member(c.id)
    )
  )
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = result_snapshots.brand_id
        and b.client_id = result_snapshots.client_id
        and public.is_client_member(c.id)
    )
  );

drop policy "result_snapshots_delete_own" on public.result_snapshots;
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
        and public.is_client_member(c.id)
    )
  );

drop policy "dev_tasks_select_own" on public.dev_tasks;
create policy "dev_tasks_select_own" on public.dev_tasks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = dev_tasks.brand_id
        and b.client_id = dev_tasks.client_id
        and public.is_client_member(c.id)
    )
  );

drop policy "dev_tasks_insert_own" on public.dev_tasks;
create policy "dev_tasks_insert_own" on public.dev_tasks
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = dev_tasks.brand_id
        and b.client_id = dev_tasks.client_id
        and public.is_client_member(c.id)
    )
  );

drop policy "dev_tasks_update_own" on public.dev_tasks;
create policy "dev_tasks_update_own" on public.dev_tasks
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = dev_tasks.brand_id
        and b.client_id = dev_tasks.client_id
        and public.is_client_member(c.id)
    )
  )
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = dev_tasks.brand_id
        and b.client_id = dev_tasks.client_id
        and public.is_client_member(c.id)
    )
  );

drop policy "dev_tasks_delete_own" on public.dev_tasks;
create policy "dev_tasks_delete_own" on public.dev_tasks
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = dev_tasks.brand_id
        and b.client_id = dev_tasks.client_id
        and public.is_client_member(c.id)
    )
  );
