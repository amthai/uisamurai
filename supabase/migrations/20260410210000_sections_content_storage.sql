-- Sections (theory body + assignment), FK from comments; Storage bucket for admin images.

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  sort_order int not null default 0,
  is_published boolean not null default false,
  body jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  assignment jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  meta_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sections_sort_order on public.sections (sort_order);
create index if not exists idx_sections_published on public.sections (is_published);

drop trigger if exists trg_sections_updated_at on public.sections;
create trigger trg_sections_updated_at
before update on public.sections
for each row
execute function public.set_updated_at();

-- MVP: enforce FK; remove orphan comments from pre-section schema (no production reliance).
truncate table public.comments cascade;

alter table public.comments
  add constraint comments_section_id_fkey
  foreign key (section_id) references public.sections (id) on delete cascade;

-- Public bucket for images embedded in section HTML (URLs written by server after upload).
insert into storage.buckets (id, name, public)
values ('content-images', 'content-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "content_images_public_read" on storage.objects;
create policy "content_images_public_read"
on storage.objects for select
to public
using (bucket_id = 'content-images');
