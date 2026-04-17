alter table public.users
  alter column telegram_id drop not null;

alter table public.users
  add column if not exists yandex_id text unique,
  add column if not exists yandex_login text,
  add column if not exists yandex_email text,
  add column if not exists auth_provider text not null default 'telegram';

update public.users
set auth_provider = case
  when yandex_id is not null then 'yandex'
  else 'telegram'
end
where auth_provider is null or auth_provider not in ('telegram', 'yandex');

alter table public.users
  drop constraint if exists users_auth_provider_check;

alter table public.users
  add constraint users_auth_provider_check
  check (auth_provider in ('telegram', 'yandex'));

alter table public.users
  drop constraint if exists users_identity_present_check;

alter table public.users
  add constraint users_identity_present_check
  check (telegram_id is not null or yandex_id is not null);
