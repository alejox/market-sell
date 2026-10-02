-- Development task notebook ("Tareas") for the Ventex marketing workspace.
--
--   dev_tasks -> src/modules/tasks/domain/dev-task.ts
--
-- Same ownership model as the rest of the workspace schema
-- (20260925053019_workspace_schema.sql): every row is scoped by client_id +
-- brand_id through a composite foreign key to public.brands, and row level
-- security binds every operation to the owner of the client through
-- auth.uid(). Domain ids are opaque text, so the primary key is text.

create table public.dev_tasks (
  id text primary key,
  client_id text not null,
  brand_id text not null,
  title text not null check (length(btrim(title)) > 0),
  status text not null check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  -- Free-text team member name; null means unassigned.
  assignee text,
  due_date date,
  -- The task's notebook page, lightweight Markdown.
  notes text not null default '',
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, brand_id) references public.brands (client_id, id)
);

create index dev_tasks_client_brand_idx on public.dev_tasks (client_id, brand_id);
create index dev_tasks_status_idx on public.dev_tasks (client_id, brand_id, status);

alter table public.dev_tasks enable row level security;

revoke all on public.dev_tasks from public;
revoke all on public.dev_tasks from anon;
grant select, insert, update, delete on public.dev_tasks to authenticated;

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
        and c.owner_id = (select auth.uid())
    )
  );

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
        and c.owner_id = (select auth.uid())
    )
  );

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
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.brands b
      join public.clients c on c.id = b.client_id
      where b.id = dev_tasks.brand_id
        and b.client_id = dev_tasks.client_id
        and c.owner_id = (select auth.uid())
    )
  );

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
        and c.owner_id = (select auth.uid())
    )
  );
