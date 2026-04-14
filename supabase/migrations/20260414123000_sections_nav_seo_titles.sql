alter table public.sections
  add column if not exists nav_title text,
  add column if not exists seo_title text;

update public.sections
set nav_title = title
where nav_title is null;

update public.sections
set seo_title = title
where seo_title is null;
