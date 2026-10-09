-- Per-user, per-device salinity alert subscriptions. Apply in Supabase SQL Editor.
create table if not exists public.salinity_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  province text not null,
  station text,
  threshold numeric(8, 2) not null check (threshold >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists salinity_push_subscriptions_match_idx
  on public.salinity_push_subscriptions (province, station, active);
create index if not exists salinity_push_subscriptions_user_idx
  on public.salinity_push_subscriptions (user_id, active);

alter table public.salinity_push_subscriptions enable row level security;
drop policy if exists "Users read own salinity push subscriptions" on public.salinity_push_subscriptions;
create policy "Users read own salinity push subscriptions"
  on public.salinity_push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "Users create own salinity push subscriptions" on public.salinity_push_subscriptions;
create policy "Users create own salinity push subscriptions"
  on public.salinity_push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "Users update own salinity push subscriptions" on public.salinity_push_subscriptions;
create policy "Users update own salinity push subscriptions"
  on public.salinity_push_subscriptions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "Users delete own salinity push subscriptions" on public.salinity_push_subscriptions;
create policy "Users delete own salinity push subscriptions"
  on public.salinity_push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Service-role-only idempotency ledger prevents webhook retries sending duplicates.
create table if not exists public.salinity_push_deliveries (
  id bigint generated always as identity primary key,
  subscription_id uuid not null references public.salinity_push_subscriptions(id) on delete cascade,
  prediction_id bigint not null references public.prophet_predict(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (subscription_id, prediction_id)
);
alter table public.salinity_push_deliveries enable row level security;

comment on table public.salinity_push_subscriptions is 'FCM browser/device tokens and per-user salinity alert filters';
comment on table public.salinity_push_deliveries is 'Idempotency ledger for salinity push webhook deliveries; backend service role only';
