-- Veil schema, as approved in docs/PLAN.md on 2026-10-16.
-- Run once in the Supabase dashboard SQL editor, then run supabase/seed.sql.
--
-- Every table has RLS enabled and no policies, so the anon and authenticated roles
-- can read or write nothing. Only server routes, using SUPABASE_SECRET_KEY, touch data.

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('school', 'store', 'hospital')),
  created_at timestamptz not null default now()
);

create table public.clips (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id),
  filename text not null check (char_length(filename) between 1 and 200),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  signature text not null,
  captured_at timestamptz not null,
  frame_count int not null check (frame_count between 1 and 20),
  created_at timestamptz not null default now()
);
create index clips_site_id_idx on public.clips (site_id);
create index clips_created_at_idx on public.clips (created_at desc);

create table public.frames (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references public.clips (id) on delete cascade,
  frame_index int not null check (frame_index >= 0),
  t_seconds numeric not null check (t_seconds >= 0),
  blurred_path text not null,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  unique (clip_id, frame_index)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references public.clips (id) on delete cascade,
  frame_id uuid not null references public.frames (id) on delete cascade,
  type text not null check (type in ('fall', 'fight', 'theft', 'fire', 'other')),
  confidence numeric not null check (confidence between 0 and 1),
  description text not null check (char_length(description) between 1 and 300),
  flagged boolean not null,
  created_at timestamptz not null default now()
);
create index events_clip_id_idx on public.events (clip_id);
create index events_frame_id_idx on public.events (frame_id);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events (id) on delete cascade,
  site_id uuid not null references public.sites (id),
  label text not null check (label in ('real', 'false_alarm')),
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);
create index feedback_site_id_idx on public.feedback (site_id);
create index feedback_created_at_idx on public.feedback (created_at desc);

create table public.face_vault (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references public.clips (id) on delete cascade,
  frame_id uuid not null references public.frames (id) on delete cascade,
  encrypted_path text not null,
  wrapped_key text not null,
  iv text not null,
  bbox jsonb not null,
  created_at timestamptz not null default now()
);
create index face_vault_clip_id_idx on public.face_vault (clip_id);
create index face_vault_frame_id_idx on public.face_vault (frame_id);

-- No cascade: a face that was ever unlocked cannot be deleted out from under its audit trail.
create table public.unlock_audit (
  id uuid primary key default gen_random_uuid(),
  face_id uuid not null references public.face_vault (id) on delete restrict,
  actor text not null,
  reason_category text not null check (
    reason_category in ('incident_investigation', 'safety_emergency', 'legal_request', 'other')
  ),
  reason text not null check (char_length(btrim(reason)) between 15 and 500),
  created_at timestamptz not null default now()
);
create index unlock_audit_face_id_idx on public.unlock_audit (face_id);
create index unlock_audit_created_at_idx on public.unlock_audit (created_at desc);

alter table public.sites enable row level security;
alter table public.clips enable row level security;
alter table public.frames enable row level security;
alter table public.events enable row level security;
alter table public.feedback enable row level security;
alter table public.face_vault enable row level security;
alter table public.unlock_audit enable row level security;

-- "Logged forever": audit rows can be added, never changed or removed.
create function public.prevent_audit_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'unlock_audit is append-only';
end;
$$;

create trigger unlock_audit_no_update_or_delete
  before update or delete on public.unlock_audit
  for each row execute function public.prevent_audit_changes();

create trigger unlock_audit_no_truncate
  before truncate on public.unlock_audit
  for each statement execute function public.prevent_audit_changes();

-- One upload writes a clip, its frames, and its locked faces. PostgREST runs each RPC in
-- a single transaction, so either all rows land or none do.
create function public.create_clip(p_clip jsonb, p_frames jsonb, p_faces jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.clips (id, site_id, filename, sha256, signature, captured_at, frame_count, created_at)
  values (
    (p_clip ->> 'id')::uuid,
    (p_clip ->> 'site_id')::uuid,
    p_clip ->> 'filename',
    p_clip ->> 'sha256',
    p_clip ->> 'signature',
    (p_clip ->> 'captured_at')::timestamptz,
    (p_clip ->> 'frame_count')::int,
    (p_clip ->> 'created_at')::timestamptz
  );

  insert into public.frames (id, clip_id, frame_index, t_seconds, blurred_path, sha256)
  select f.id, f.clip_id, f.frame_index, f.t_seconds, f.blurred_path, f.sha256
  from jsonb_to_recordset(p_frames) as f (
    id uuid, clip_id uuid, frame_index int, t_seconds numeric, blurred_path text, sha256 text
  );

  insert into public.face_vault (id, clip_id, frame_id, encrypted_path, wrapped_key, iv, bbox)
  select v.id, v.clip_id, v.frame_id, v.encrypted_path, v.wrapped_key, v.iv, v.bbox
  from jsonb_to_recordset(p_faces) as v (
    id uuid, clip_id uuid, frame_id uuid, encrypted_path text, wrapped_key text, iv text, bbox jsonb
  );
end;
$$;

-- Functions in public are callable through the API by default. Only the server may call this one.
revoke all on function public.create_clip (jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_clip (jsonb, jsonb, jsonb) to service_role;
revoke all on function public.prevent_audit_changes () from public, anon, authenticated;

-- Private buckets: blurred frames and encrypted face crops, read only through short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('frames', 'frames', false, 1048576, array['image/jpeg']),
  ('vault', 'vault', false, 1048576, array['application/octet-stream'])
on conflict (id) do nothing;
