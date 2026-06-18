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
