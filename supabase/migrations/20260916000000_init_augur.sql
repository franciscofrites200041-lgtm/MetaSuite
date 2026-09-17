-- Toruk AUGUR — initial schema
-- Spec ref: MVP/toruk-augur-mvp-spec.md § 4
-- Runs on Supabase Postgres. RLS on every table. Auth via Supabase Auth (auth.users).

------------------------------------------------------------------------------
-- extensions
------------------------------------------------------------------------------
create extension if not exists "pgcrypto";

------------------------------------------------------------------------------
-- helpers
------------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

------------------------------------------------------------------------------
-- accounts (tenant: agencia o profesional individual)
------------------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_publish_mode text not null default 'approval' check (default_publish_mode in ('auto','approval')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger accounts_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- account_members (users <-> accounts)
------------------------------------------------------------------------------
create table if not exists public.account_members (
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','editor')),
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);
create index if not exists account_members_user_idx on public.account_members(user_id);

-- helper: is the current auth user a member of this account?
create or replace function public.is_account_member(a_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists(
    select 1 from public.account_members
    where account_id = a_id and user_id = auth.uid()
  );
$$;

------------------------------------------------------------------------------
-- companies (empresa gestionada dentro de una account)
------------------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  slug text not null,
  industry text,
  social_links jsonb not null default '{}'::jsonb,
  description text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, slug)
);
create index if not exists companies_account_idx on public.companies(account_id);
create trigger companies_updated_at before update on public.companies
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- meta_connections (una por company)
------------------------------------------------------------------------------
create table if not exists public.meta_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  meta_ad_account_id text not null,
  meta_page_id text,
  meta_business_id text,
  -- AES-256-GCM. All three fields are base64 strings — easier to round-trip
  -- through PostgREST/Supabase-JS than bytea (which comes back as \x...).
  access_token_ciphertext text not null,
  access_token_iv text not null,
  access_token_tag text not null,
  token_expires_at timestamptz,
  status text not null default 'active' check (status in ('active','expired','revoked','error')),
  last_error text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id)
);
create trigger meta_connections_updated_at before update on public.meta_connections
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- objectives (proyecto de pauta)
------------------------------------------------------------------------------
create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  brief_md text not null default '',
  status text not null default 'drafting' check (status in ('drafting','ready','launched','archived')),
  publish_mode text check (publish_mode in ('auto','approval')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists objectives_company_idx on public.objectives(company_id);
create trigger objectives_updated_at before update on public.objectives
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- chat_threads (1:1 con objective)
------------------------------------------------------------------------------
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.objectives(id) on delete cascade,
  model_id text not null default 'anthropic/claude-sonnet-4-5',
  created_at timestamptz not null default now(),
  unique (objective_id)
);

------------------------------------------------------------------------------
-- chat_messages
------------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  content text not null,
  agent text, -- orquestador | briefing | copywriting | visual | meta-builder
  tokens_in int,
  tokens_out int,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_thread_idx on public.chat_messages(thread_id, created_at);

------------------------------------------------------------------------------
-- ad_creatives (copies + prompts de imagen)
------------------------------------------------------------------------------
create table if not exists public.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.objectives(id) on delete cascade,
  copy_text text not null,
  image_prompt text,
  status text not null default 'draft' check (status in ('draft','approved','used','discarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ad_creatives_objective_idx on public.ad_creatives(objective_id);
create trigger ad_creatives_updated_at before update on public.ad_creatives
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- campaigns / ad_sets / ads (espejo de Meta)
------------------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.objectives(id) on delete cascade,
  meta_campaign_id text,
  name text not null,
  status text not null default 'draft' check (status in ('draft','pending_approval','published','paused','error')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaigns_objective_idx on public.campaigns(objective_id);
create trigger campaigns_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();

create table if not exists public.ad_sets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  meta_adset_id text,
  name text not null,
  status text not null default 'draft' check (status in ('draft','pending_approval','published','paused','error')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ad_sets_campaign_idx on public.ad_sets(campaign_id);
create trigger ad_sets_updated_at before update on public.ad_sets
  for each row execute function public.set_updated_at();

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  ad_set_id uuid not null references public.ad_sets(id) on delete cascade,
  creative_id uuid references public.ad_creatives(id) on delete set null,
  meta_ad_id text,
  name text not null,
  status text not null default 'draft' check (status in ('draft','pending_approval','published','paused','error')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ads_ad_set_idx on public.ads(ad_set_id);
create trigger ads_updated_at before update on public.ads
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- RLS: every table on; base rule = user must be member of account
------------------------------------------------------------------------------
alter table public.accounts         enable row level security;
alter table public.account_members  enable row level security;
alter table public.companies        enable row level security;
alter table public.meta_connections enable row level security;
alter table public.objectives       enable row level security;
alter table public.chat_threads     enable row level security;
alter table public.chat_messages    enable row level security;
alter table public.ad_creatives     enable row level security;
alter table public.campaigns        enable row level security;
alter table public.ad_sets          enable row level security;
alter table public.ads              enable row level security;

-- accounts: members can read, owners can update; anyone authenticated can create (they become the owner)
create policy "accounts read" on public.accounts for select using (public.is_account_member(id));
create policy "accounts update" on public.accounts for update using (public.is_account_member(id));
create policy "accounts insert" on public.accounts for insert with check (auth.uid() is not null);

-- account_members: readable if you belong to that account; insert only via server (service role)
create policy "members read" on public.account_members for select using (public.is_account_member(account_id));

-- companies: crud restricted to members
create policy "companies read"   on public.companies for select using (public.is_account_member(account_id));
create policy "companies insert" on public.companies for insert with check (public.is_account_member(account_id));
create policy "companies update" on public.companies for update using (public.is_account_member(account_id));
create policy "companies delete" on public.companies for delete using (public.is_account_member(account_id));

-- helper: is member via company id
create or replace function public.is_company_member(c_id uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.companies c
    join public.account_members m on m.account_id = c.account_id
    where c.id = c_id and m.user_id = auth.uid()
  );
$$;

-- helper: is member via objective id
create or replace function public.is_objective_member(o_id uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.objectives o
    join public.companies c on c.id = o.company_id
    join public.account_members m on m.account_id = c.account_id
    where o.id = o_id and m.user_id = auth.uid()
  );
$$;

-- meta_connections: crud by company members
create policy "meta_conn read"   on public.meta_connections for select using (public.is_company_member(company_id));
create policy "meta_conn insert" on public.meta_connections for insert with check (public.is_company_member(company_id));
create policy "meta_conn update" on public.meta_connections for update using (public.is_company_member(company_id));
create policy "meta_conn delete" on public.meta_connections for delete using (public.is_company_member(company_id));

-- objectives
create policy "obj read"   on public.objectives for select using (public.is_company_member(company_id));
create policy "obj insert" on public.objectives for insert with check (public.is_company_member(company_id));
create policy "obj update" on public.objectives for update using (public.is_company_member(company_id));
create policy "obj delete" on public.objectives for delete using (public.is_company_member(company_id));

-- chat_threads / chat_messages
create policy "thread read"   on public.chat_threads for select using (public.is_objective_member(objective_id));
create policy "thread insert" on public.chat_threads for insert with check (public.is_objective_member(objective_id));
create policy "thread update" on public.chat_threads for update using (public.is_objective_member(objective_id));

create policy "msg read"   on public.chat_messages for select using (
  exists (select 1 from public.chat_threads t where t.id = thread_id and public.is_objective_member(t.objective_id))
);
create policy "msg insert" on public.chat_messages for insert with check (
  exists (select 1 from public.chat_threads t where t.id = thread_id and public.is_objective_member(t.objective_id))
);

-- ad_creatives
create policy "creative read"   on public.ad_creatives for select using (public.is_objective_member(objective_id));
create policy "creative insert" on public.ad_creatives for insert with check (public.is_objective_member(objective_id));
create policy "creative update" on public.ad_creatives for update using (public.is_objective_member(objective_id));
create policy "creative delete" on public.ad_creatives for delete using (public.is_objective_member(objective_id));

-- campaigns / ad_sets / ads
create policy "camp read"   on public.campaigns for select using (public.is_objective_member(objective_id));
create policy "camp insert" on public.campaigns for insert with check (public.is_objective_member(objective_id));
create policy "camp update" on public.campaigns for update using (public.is_objective_member(objective_id));
create policy "camp delete" on public.campaigns for delete using (public.is_objective_member(objective_id));

create policy "adset read"   on public.ad_sets for select using (
  exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_objective_member(c.objective_id))
);
create policy "adset insert" on public.ad_sets for insert with check (
  exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_objective_member(c.objective_id))
);
create policy "adset update" on public.ad_sets for update using (
  exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_objective_member(c.objective_id))
);
create policy "adset delete" on public.ad_sets for delete using (
  exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_objective_member(c.objective_id))
);

create policy "ad read"   on public.ads for select using (
  exists (
    select 1 from public.ad_sets s join public.campaigns c on c.id = s.campaign_id
    where s.id = ad_set_id and public.is_objective_member(c.objective_id)
  )
);
create policy "ad insert" on public.ads for insert with check (
  exists (
    select 1 from public.ad_sets s join public.campaigns c on c.id = s.campaign_id
    where s.id = ad_set_id and public.is_objective_member(c.objective_id)
  )
);
create policy "ad update" on public.ads for update using (
  exists (
    select 1 from public.ad_sets s join public.campaigns c on c.id = s.campaign_id
    where s.id = ad_set_id and public.is_objective_member(c.objective_id)
  )
);
create policy "ad delete" on public.ads for delete using (
  exists (
    select 1 from public.ad_sets s join public.campaigns c on c.id = s.campaign_id
    where s.id = ad_set_id and public.is_objective_member(c.objective_id)
  )
);

------------------------------------------------------------------------------
-- Onboarding: after a user signs up, auto-create an account + membership.
-- The app can rename the account later.
------------------------------------------------------------------------------
create or replace function public.bootstrap_user_account()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  new_account_id uuid;
  user_name text;
begin
  user_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1),
    'Mi cuenta'
  );
  insert into public.accounts (name) values (user_name || ' workspace')
    returning id into new_account_id;
  insert into public.account_members (account_id, user_id, role)
    values (new_account_id, new.id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.bootstrap_user_account();

------------------------------------------------------------------------------
-- Storage bucket for logos + brief files
------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('briefs', 'briefs', false)
on conflict (id) do nothing;
