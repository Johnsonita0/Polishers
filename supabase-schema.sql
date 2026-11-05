create sequence if not exists public.service_request_reference_seq;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'admin' check (role in ('admin', 'super_admin', 'staff')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'PDE-' || lpad(nextval('public.service_request_reference_seq')::text, 6, '0')
  ),
  full_name text not null,
  phone text not null,
  email text,
  service_type text not null,
  property_type text,
  size_note text,
  address text,
  preferred_date date,
  preferred_time text,
  message text,
  photo_urls text[] not null default '{}',
  status text not null default 'new'
    check (status in ('new', 'contacted', 'quoted', 'scheduled', 'in_progress', 'completed', 'cancelled', 'lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_requests_created_at_idx
  on public.service_requests (created_at desc);
create index if not exists service_requests_status_idx
  on public.service_requests (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists service_requests_set_updated_at on public.service_requests;
create trigger service_requests_set_updated_at
  before update on public.service_requests
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role, is_active)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    'admin',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, full_name, role, is_active)
select
  id,
  nullif(btrim(raw_user_meta_data ->> 'full_name'), ''),
  'admin',
  false
from auth.users
on conflict (id) do nothing;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active
      and role in ('admin', 'super_admin')
  );
$$;

alter table public.profiles enable row level security;
alter table public.service_requests enable row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_active_admin()));

drop policy if exists service_requests_admin_access on public.service_requests;
create policy service_requests_admin_access
  on public.service_requests
  for all
  to authenticated
  using ((select public.is_active_admin()))
  with check ((select public.is_active_admin()));

grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.service_requests to authenticated;
grant usage, select on sequence public.service_request_reference_seq to authenticated;
grant execute on function public.is_active_admin() to authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

create or replace function public.submit_request(request_data jsonb)
returns table (reference text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text := nullif(btrim(request_data ->> 'full_name'), '');
  v_phone text := nullif(btrim(request_data ->> 'phone'), '');
  v_service_type text := nullif(btrim(request_data ->> 'service_type'), '');
  v_photos jsonb := coalesce(request_data -> 'photo_urls', '[]'::jsonb);
  v_reference text;
begin
  if jsonb_typeof(request_data) is distinct from 'object' then
    raise exception 'Invalid request payload';
  end if;

  if v_full_name is null or v_phone is null or v_service_type is null then
    raise exception 'Name, phone number, and service type are required';
  end if;

  if length(v_full_name) > 160
    or length(v_phone) > 50
    or length(v_service_type) > 100
    or length(coalesce(request_data ->> 'message', '')) > 5000 then
    raise exception 'Request fields exceed the allowed length';
  end if;

  if jsonb_typeof(v_photos) is distinct from 'array' or jsonb_array_length(v_photos) > 5 then
    raise exception 'Invalid request attachments';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(v_photos) as photo(path)
    where photo.path !~ '^requests/[A-Za-z0-9._/-]{1,250}$'
      or photo.path like '%..%'
  ) then
    raise exception 'Invalid request attachment path';
  end if;

  insert into public.service_requests (
    full_name,
    phone,
    email,
    service_type,
    property_type,
    size_note,
    address,
    preferred_date,
    preferred_time,
    message,
    photo_urls
  )
  values (
    v_full_name,
    v_phone,
    nullif(btrim(request_data ->> 'email'), ''),
    v_service_type,
    nullif(btrim(request_data ->> 'property_type'), ''),
    nullif(btrim(request_data ->> 'size_note'), ''),
    nullif(btrim(request_data ->> 'address'), ''),
    nullif(request_data ->> 'preferred_date', '')::date,
    nullif(btrim(request_data ->> 'preferred_time'), ''),
    nullif(btrim(request_data ->> 'message'), ''),
    coalesce(
      array(
        select photo.path
        from jsonb_array_elements_text(v_photos) as photo(path)
      ),
      '{}'::text[]
    )
  )
  returning service_requests.reference into v_reference;

  return query select v_reference;
end;
$$;

revoke all on function public.submit_request(jsonb) from public;
grant execute on function public.submit_request(jsonb) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-uploads',
  'request-uploads',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists request_uploads_insert on storage.objects;
create policy request_uploads_insert
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'request-uploads'
    and (storage.foldername(name))[1] = 'requests'
  );

drop policy if exists request_uploads_admin_read on storage.objects;
create policy request_uploads_admin_read
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'request-uploads'
    and (select public.is_active_admin())
  );

-- After running this file, activate only the intended admin profile in the Supabase SQL Editor.
-- Use the account ID from Authentication > Users; never place a real account ID or password here.
-- UPDATE public.profiles SET role = 'super_admin', is_active = true WHERE id = '<AUTH_USER_ID>';