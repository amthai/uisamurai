create table if not exists public.comment_attachments (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  public_url text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  sort_order smallint not null default 0 check (sort_order >= 0 and sort_order < 10),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_comment_attachments_comment_order
  on public.comment_attachments(comment_id, sort_order);

create index if not exists idx_comment_attachments_comment_id
  on public.comment_attachments(comment_id);
