create extension if not exists pgcrypto;

create table if not exists recipient_profiles (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  social_graph jsonb not null default '{}'::jsonb,
  on_chain jsonb not null default '{}'::jsonb,
  social jsonb not null default '{}'::jsonb,
  analysis jsonb not null default '{}'::jsonb,
  solar_persona jsonb not null default '{}'::jsonb,
  built_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gift_recommendations (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references recipient_profiles(wallet_address),
  relationship_context text not null,
  profile_snapshot jsonb not null,
  recommendation jsonb not null,
  model text,
  provider text not null default 'openrouter',
  created_at timestamptz not null default now()
);

create index if not exists gift_recommendations_wallet_created_idx
  on gift_recommendations (wallet_address, created_at desc);
