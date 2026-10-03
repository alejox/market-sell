-- Personal tasks and notes ("Mis notas") for the Ventex marketing workspace.
--
--   personal_items -> src/modules/personal/domain/personal-item.ts
--
-- Unlike every other table, rows are private to ONE person: the policies bind
-- to user_id = auth.uid(), so not even the owner or another team member can
-- read someone else's items. Membership of the client is still required, so a
-- person who is no longer in the team cannot reach them either. Every user
-- starts with zero rows. Same client_id + brand_id scoping as the rest, via
-- the composite foreign key to public.brands.

create table public.personal_items (
  id text primary key,
  client_id text not null,
  brand_id text not null,
  user_id uuid not null default auth.uid() references auth.users (id),
  kind text not null check (kind in ('task', 'note')),
  title text not null check (length(btrim(title)) > 0),
  -- The item's page, lightweight Markdown.
  body text not null default '',
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind = 'task' or done = false),
  foreign key (client_id, brand_id) references public.brands (client_id, id)
);

create index personal_items_owner_idx on public.personal_items (user_id, client_id, brand_id);

alter table public.personal_items enable row level security;

revoke all on public.personal_items from public;
revoke all on public.personal_items from anon;
grant select, insert, update, delete on public.personal_items to authenticated;

create policy "personal_items_select_own" on public.personal_items
  for select
  to authenticated
  using (user_id = (select auth.uid()) and public.is_client_member(client_id));

create policy "personal_items_insert_own" on public.personal_items
  for insert
  to authenticated
  with check (user_id = (select auth.uid()) and public.is_client_member(client_id));

create policy "personal_items_update_own" on public.personal_items
  for update
  to authenticated
  using (user_id = (select auth.uid()) and public.is_client_member(client_id))
  with check (user_id = (select auth.uid()) and public.is_client_member(client_id));

create policy "personal_items_delete_own" on public.personal_items
  for delete
  to authenticated
  using (user_id = (select auth.uid()) and public.is_client_member(client_id));
