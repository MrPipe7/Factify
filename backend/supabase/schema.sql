-- Factify: caché de verificaciones (Supabase)
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query

create table if not exists public.verification_cache (
  cache_key text primary key,
  query_text text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists verification_cache_expires_idx
  on public.verification_cache (expires_at);

-- Solo el service role (backend) debe escribir/leer.
alter table public.verification_cache enable row level security;

-- Tabla de analytics: eventos anónimos para el dashboard de estadísticas.
create table if not exists public.analytics_events (
  id bigint primary key generated always as identity,
  event_type text not null,
  classification text,
  confidence integer,
  input_kind text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_type_idx
  on public.analytics_events (event_type);
create index if not exists analytics_events_created_idx
  on public.analytics_events (created_at);

alter table public.analytics_events enable row level security;
