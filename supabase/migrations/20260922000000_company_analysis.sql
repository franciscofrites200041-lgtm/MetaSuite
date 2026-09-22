-- Web/Maps analysis per company. Feeds the AI orchestrator context (brief
-- general) plus the company page's SEO/GEO cards.

alter table public.companies
  add column if not exists google_maps_url text,
  add column if not exists has_physical_location boolean not null default true,
  add column if not exists brief_general_md text,
  add column if not exists brief_general_updated_at timestamptz;

create table if not exists public.company_analysis (
  company_id uuid primary key references public.companies(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','running','complete','error')),
  seo_score int,
  seo_summary text,
  seo_recommendations jsonb,
  geo_score int,
  geo_summary text,
  geo_recommendations jsonb,
  place_id text,
  place_data jsonb,
  scraped_urls text[],
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.company_analysis enable row level security;
create policy "ca read"   on public.company_analysis for select using (public.is_company_member(company_id));
create policy "ca insert" on public.company_analysis for insert with check (public.is_company_member(company_id));
create policy "ca update" on public.company_analysis for update using (public.is_company_member(company_id));
