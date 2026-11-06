create sequence if not exists public.service_request_reference_seq;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('admin', 'super_admin', 'staff')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles alter column role set default 'staff';

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

create table if not exists public.site_content_sections (
  section text primary key check (section in ('hero', 'services', 'gallery', 'testimonials', 'faqs')),
  is_managed boolean not null default false,
  media_path text,
  media_type text check (media_type in ('image', 'video')),
  media_updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_content_sections add column if not exists media_path text;
alter table public.site_content_sections add column if not exists media_type text;
alter table public.site_content_sections add column if not exists media_updated_by uuid references public.profiles (id) on delete set null;

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  section text not null references public.site_content_sections (section) on delete cascade,
  slug text not null,
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  is_published boolean not null default false,
  sort_order integer not null default 0,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_content_section_slug_unique unique (section, slug)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('request_created', 'request_status_changed')),
  request_id uuid references public.service_requests (id) on delete set null,
  request_reference text not null,
  title text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create table if not exists public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  preheader text not null default '',
  body text not null default '',
  image_url text,
  cta_label text not null default '',
  cta_url text not null default '',
  status text not null default 'draft' check (status in ('draft', 'sending', 'sent')),
  resend_broadcast_id text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.newsletter_subscribers (
  email text primary key,
  created_at timestamptz not null default now()
);

create or replace function public.subscribe_to_newsletter(subscriber_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(subscriber_email));
  inserted_count integer;
begin
  if normalized_email is null
    or length(normalized_email) > 254
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address';
  end if;

  insert into public.newsletter_subscribers (email)
  values (normalized_email)
  on conflict (email) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;

insert into public.site_content_sections (section, is_managed)
values
  ('hero', false),
  ('services', false),
  ('gallery', false),
  ('testimonials', false),
  ('faqs', false)
on conflict (section) do nothing;

create index if not exists service_requests_created_at_idx
  on public.service_requests (created_at desc);
create index if not exists service_requests_status_idx
  on public.service_requests (status);
create index if not exists notifications_created_at_idx
  on public.notifications (created_at desc);
create unique index if not exists notifications_request_created_unique
  on public.notifications (request_id)
  where event_type = 'request_created' and request_id is not null;
create index if not exists newsletter_campaigns_created_at_idx
  on public.newsletter_campaigns (created_at desc);
create index if not exists newsletter_subscribers_created_at_idx
  on public.newsletter_subscribers (created_at desc);

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

drop trigger if exists site_content_sections_set_updated_at on public.site_content_sections;
create trigger site_content_sections_set_updated_at
  before update on public.site_content_sections
  for each row execute function public.set_updated_at();

drop trigger if exists site_content_set_updated_at on public.site_content;
create trigger site_content_set_updated_at
  before update on public.site_content
  for each row execute function public.set_updated_at();

drop trigger if exists newsletter_campaigns_set_updated_at on public.newsletter_campaigns;
create trigger newsletter_campaigns_set_updated_at
  before update on public.newsletter_campaigns
  for each row execute function public.set_updated_at();

create or replace function public.capture_request_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (event_type, request_id, request_reference, title, message)
    values ('request_created', new.id, new.reference, 'New service request', new.full_name || ' submitted a request for ' || new.service_type || '.');
  elsif new.status is distinct from old.status then
    insert into public.notifications (event_type, request_id, request_reference, title, message)
    values ('request_status_changed', new.id, new.reference, 'Request status updated', new.reference || ' is now ' || replace(new.status, '_', ' ') || '.');
  end if;
  return new;
end;
$$;

drop trigger if exists service_requests_notify_created on public.service_requests;
create trigger service_requests_notify_created
  after insert on public.service_requests
  for each row execute function public.capture_request_notification();

drop trigger if exists service_requests_notify_status on public.service_requests;
create trigger service_requests_notify_status
  after update of status on public.service_requests
  for each row execute function public.capture_request_notification();

insert into public.notifications (event_type, request_id, request_reference, title, message, created_at)
select 'request_created', request.id, request.reference, 'New service request',
  request.full_name || ' submitted a request for ' || request.service_type || '.', request.created_at
from public.service_requests as request
where not exists (
  select 1 from public.notifications as notification
  where notification.event_type = 'request_created' and notification.request_id = request.id
);

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
    'staff',
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
  'staff',
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
alter table public.site_content_sections enable row level security;
alter table public.site_content enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.newsletter_campaigns enable row level security;
alter table public.newsletter_subscribers enable row level security;

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

drop policy if exists site_content_sections_public_read on public.site_content_sections;
create policy site_content_sections_public_read
  on public.site_content_sections
  for select
  to anon, authenticated
  using (true);

drop policy if exists site_content_sections_admin_access on public.site_content_sections;
create policy site_content_sections_admin_access
  on public.site_content_sections
  for all
  to authenticated
  using ((select public.is_active_admin()))
  with check ((select public.is_active_admin()));

drop policy if exists site_content_public_read on public.site_content;
create policy site_content_public_read
  on public.site_content
  for select
  to anon, authenticated
  using (is_published);

drop policy if exists site_content_admin_access on public.site_content;
create policy site_content_admin_access
  on public.site_content
  for all
  to authenticated
  using ((select public.is_active_admin()))
  with check ((select public.is_active_admin()));

drop policy if exists notifications_admin_read on public.notifications;
create policy notifications_admin_read
  on public.notifications
  for select
  to authenticated
  using ((select public.is_active_admin()));

drop policy if exists notification_reads_admin_select on public.notification_reads;
create policy notification_reads_admin_select
  on public.notification_reads
  for select
  to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_admin()));

drop policy if exists notification_reads_admin_insert on public.notification_reads;
create policy notification_reads_admin_insert
  on public.notification_reads
  for insert
  to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_active_admin()));

drop policy if exists notification_reads_admin_delete on public.notification_reads;
create policy notification_reads_admin_delete
  on public.notification_reads
  for delete
  to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_admin()));

drop policy if exists newsletter_campaigns_admin_access on public.newsletter_campaigns;
create policy newsletter_campaigns_admin_access
  on public.newsletter_campaigns
  for all
  to authenticated
  using ((select public.is_active_admin()))
  with check ((select public.is_active_admin()));

drop policy if exists newsletter_subscribers_admin_read on public.newsletter_subscribers;
create policy newsletter_subscribers_admin_read
  on public.newsletter_subscribers
  for select
  to authenticated
  using ((select public.is_active_admin()));

grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.service_requests to authenticated;
grant select on public.site_content_sections to anon, authenticated;
grant insert, update, delete on public.site_content_sections to authenticated;
grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;
grant select on public.notifications to authenticated;
grant select, insert, delete on public.notification_reads to authenticated;
grant select, insert, update, delete on public.newsletter_campaigns to authenticated;
grant select on public.newsletter_subscribers to authenticated;
grant usage, select on sequence public.service_request_reference_seq to authenticated;
grant execute on function public.is_active_admin() to authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.subscribe_to_newsletter(text) from public;
grant execute on function public.subscribe_to_newsletter(text) to anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.capture_request_notification() from public, anon, authenticated;

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'newsletter-media',
  'newsletter-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists newsletter_media_public_read on storage.objects;
create policy newsletter_media_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'newsletter-media' and (storage.foldername(name))[1] = 'newsletter');

drop policy if exists newsletter_media_admin_insert on storage.objects;
create policy newsletter_media_admin_insert
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'newsletter-media' and (storage.foldername(name))[1] = 'newsletter' and (select public.is_active_admin()));

drop policy if exists newsletter_media_admin_update on storage.objects;
create policy newsletter_media_admin_update
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'newsletter-media' and (storage.foldername(name))[1] = 'newsletter' and (select public.is_active_admin()))
  with check (bucket_id = 'newsletter-media' and (storage.foldername(name))[1] = 'newsletter' and (select public.is_active_admin()));

drop policy if exists newsletter_media_admin_delete on storage.objects;
create policy newsletter_media_admin_delete
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'newsletter-media' and (storage.foldername(name))[1] = 'newsletter' and (select public.is_active_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'newsletter-media',
  'newsletter-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists newsletter_media_public_read on storage.objects;
create policy newsletter_media_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'newsletter-media'
    and (storage.foldername(name))[1] = 'newsletter'
  );

drop policy if exists newsletter_media_admin_insert on storage.objects;
create policy newsletter_media_admin_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'newsletter-media'
    and (storage.foldername(name))[1] = 'newsletter'
    and (select public.is_active_admin())
  );

drop policy if exists newsletter_media_admin_update on storage.objects;
create policy newsletter_media_admin_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'newsletter-media'
    and (storage.foldername(name))[1] = 'newsletter'
    and (select public.is_active_admin())
  )
  with check (
    bucket_id = 'newsletter-media'
    and (storage.foldername(name))[1] = 'newsletter'
    and (select public.is_active_admin())
  );

drop policy if exists newsletter_media_admin_delete on storage.objects;
create policy newsletter_media_admin_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'newsletter-media'
    and (storage.foldername(name))[1] = 'newsletter'
    and (select public.is_active_admin())
  );

drop policy if exists site_media_public_read on storage.objects;
create policy site_media_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'site-media'
    and (storage.foldername(name))[1] in ('hero', 'gallery')
  );

drop policy if exists site_media_admin_insert on storage.objects;
create policy site_media_admin_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'site-media'
    and (storage.foldername(name))[1] in ('hero', 'gallery')
    and (select public.is_active_admin())
  );

drop policy if exists site_media_admin_update on storage.objects;
create policy site_media_admin_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'site-media'
    and (storage.foldername(name))[1] in ('hero', 'gallery')
    and (select public.is_active_admin())
  )
  with check (
    bucket_id = 'site-media'
    and (storage.foldername(name))[1] in ('hero', 'gallery')
    and (select public.is_active_admin())
  );

drop policy if exists site_media_admin_delete on storage.objects;
create policy site_media_admin_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'site-media'
    and (storage.foldername(name))[1] in ('hero', 'gallery')
    and (select public.is_active_admin())
  );

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