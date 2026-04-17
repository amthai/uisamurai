create table if not exists public.telegram_login_challenges (
  nonce_hash text primary key,
  telegram_id bigint,
  first_name text,
  last_name text,
  username text,
  photo_url text,
  confirmed_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tg_login_challenges_expires_at
  on public.telegram_login_challenges (expires_at);

create index if not exists idx_tg_login_challenges_consumed_at
  on public.telegram_login_challenges (consumed_at);
