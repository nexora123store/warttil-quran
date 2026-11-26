-- جدول سجل الجلسات (بيانات وصفية فقط) مع حماية Row Level Security.
-- كل مستخدم (بما فيهم المجهول) يرى ويعدّل صفوفه فقط.

create table if not exists public.sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  surah smallint not null check (surah between 1 and 114),
  from_ayah smallint not null check (from_ayah >= 1),
  to_ayah smallint not null,
  recorded_at timestamptz not null default now(),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  accuracy numeric(5,2) check (accuracy is null or accuracy between 0 and 100),
  status text not null check (status in ('completed', 'partial')),
  notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint sessions_ayah_range check (to_ayah >= from_ayah)
);

create index if not exists sessions_user_recorded_idx on public.sessions (user_id, recorded_at desc);

alter table public.sessions enable row level security;

create policy "sessions_select_own" on public.sessions
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "sessions_insert_own" on public.sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "sessions_update_own" on public.sessions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "sessions_delete_own" on public.sessions
  for delete to authenticated using ((select auth.uid()) = user_id);
