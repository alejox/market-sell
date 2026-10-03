-- People profiles and real task assignment.
--
--   profiles            -> src/modules/team/domain/profile.ts
--   dev_tasks.assignee_id -> DevTask.assigneeId (replaces the free-text assignee)
--
-- A profile is the name and job title a team member shows to the rest of the
-- team. Everyone in the client can read all profiles; each person can write
-- only their own. Email stays in team_members and is not shown in task UI.
-- Profiles are created automatically: backfilled below for the current team,
-- and by accept_invitation() for anyone who joins later.

create table public.profiles (
  client_id text not null,
  user_id uuid not null,
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  job_title text check (job_title is null or length(job_title) <= 80),
  updated_at timestamptz not null default now(),
  primary key (client_id, user_id),
  foreign key (client_id, user_id) references public.team_members (client_id, user_id)
);

alter table public.profiles enable row level security;

revoke all on public.profiles from public;
revoke all on public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;

create policy "profiles_select_member" on public.profiles
  for select
  to authenticated
  using (public.is_client_member(client_id));

create policy "profiles_insert_self" on public.profiles
  for insert
  to authenticated
  with check (user_id = (select auth.uid()) and public.is_client_member(client_id));

create policy "profiles_update_self" on public.profiles
  for update
  to authenticated
  using (user_id = (select auth.uid()) and public.is_client_member(client_id))
  with check (user_id = (select auth.uid()) and public.is_client_member(client_id));

-- Everyone already on the team gets a profile named after their email.
insert into public.profiles (client_id, user_id, display_name)
select m.client_id, m.user_id, coalesce(nullif(btrim(split_part(m.email, '@', 1)), ''), 'Sin nombre')
from public.team_members m
on conflict do nothing;

-- accept_invitation() now also creates the newcomer's profile.
create or replace function public.accept_invitation(p_token_hash text)
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

  insert into public.profiles (client_id, user_id, display_name)
  values (
    v_invitation.client_id,
    v_uid,
    coalesce(nullif(btrim(split_part(coalesce(v_email, ''), '@', 1)), ''), 'Sin nombre')
  )
  on conflict do nothing;

  update public.team_invitations
  set used_at = now(), used_by = v_uid
  where id = v_invitation.id;

  return v_invitation.client_id;
end;
$$;

-- Tasks are assigned to a team member of the same client, not to free text.
-- The free-text column is dropped only when no task still uses it.
do $$
begin
  if exists (select 1 from public.dev_tasks where assignee is not null) then
    raise exception 'dev_tasks still has free-text assignees; migrate them to assignee_id before dropping the column';
  end if;
end;
$$;

alter table public.dev_tasks drop column assignee;
alter table public.dev_tasks add column assignee_id uuid;
alter table public.dev_tasks
  add foreign key (client_id, assignee_id) references public.team_members (client_id, user_id);

create index dev_tasks_assignee_idx on public.dev_tasks (client_id, brand_id, assignee_id);
