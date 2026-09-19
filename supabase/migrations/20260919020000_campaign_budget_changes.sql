-- Audit log of every daily-budget change the agent (or user) applies to a
-- Meta campaign. Feeds the "Actividad del agente" panel in the company
-- dashboard so the user can see what the AI did and why.

create table if not exists public.campaign_budget_changes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  old_daily_budget_cents int,
  new_daily_budget_cents int not null,
  reason text,
  changed_by text not null default 'agent' check (changed_by in ('agent','user')),
  created_at timestamptz not null default now()
);
create index if not exists cbc_campaign_idx on public.campaign_budget_changes(campaign_id, created_at desc);

alter table public.campaign_budget_changes enable row level security;

create policy "cbc read"   on public.campaign_budget_changes for select using (
  exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_objective_member(c.objective_id))
);
create policy "cbc insert" on public.campaign_budget_changes for insert with check (
  exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_objective_member(c.objective_id))
);
