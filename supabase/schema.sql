-- ============================================================
-- TAKBİS / Değerleme Araçları — Üyelik & Kredi Şeması (v2)
-- Lot tabanlı kredi modeli. Supabase → SQL Editor'de tek seferde çalıştırın.
--
-- Model:
--   • İlk kayıt          → 10 kredi (welcome), 30 gün geçerli
--   • Premium abonelik   → her dönem 200 kredi, dönem sonunda otomatik geçersiz
--   • Ek kredi paketi    → satın alınır, 30 gün geçerli
--   • Bakiye             = süresi geçmemiş lotların remaining toplamı
--   • Tüketim            = en erken biten lottan başlar (FEFO), atomik & kilitli
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. profiles
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- 2. subscriptions  (kullanıcı başına tek aktif abonelik)
-- ────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  plan                  text not null default 'premium',         -- 'premium'
  status                text not null default 'active',          -- 'active' | 'past_due' | 'canceled'
  billing_period        text not null default 'monthly',         -- 'monthly' | 'yearly'
  current_period_start  timestamptz not null default now(),
  current_period_end    timestamptz not null,
  iyzico_subscription_ref text,                                  -- ödeme entegrasyonu için (sonra)
  created_at            timestamptz not null default now(),
  unique(user_id)
);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 3. credit_lots  (her kredi yüklemesi = bir satır)
-- ────────────────────────────────────────────────────────────
create table if not exists public.credit_lots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  source      text not null,                       -- 'welcome' | 'subscription' | 'purchase'
  amount      integer not null check (amount > 0), -- başlangıç miktarı
  remaining   integer not null check (remaining >= 0),
  granted_at  timestamptz not null default now(),
  expires_at  timestamptz                          -- null = süresiz (kullanılmıyor ama destekli)
);

create index if not exists credit_lots_user_active_idx
  on public.credit_lots (user_id, expires_at)
  where remaining > 0;

alter table public.credit_lots enable row level security;

-- Kullanıcı sadece kendi lotlarını GÖRÜR. Yazma yalnızca SECURITY DEFINER fonksiyonlarıyla.
drop policy if exists "credit_lots_select_own" on public.credit_lots;
create policy "credit_lots_select_own"
  on public.credit_lots for select using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 4. credit_usage_log  (KVKK: sadece sayaç, içerik yok)
-- ────────────────────────────────────────────────────────────
create table if not exists public.credit_usage_log (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  action    text not null,                 -- 'takbis_read' | 'location_report' | ...
  cost      integer not null,
  used_at   timestamptz not null default now()
);

create index if not exists credit_usage_log_user_idx
  on public.credit_usage_log (user_id, used_at desc);

alter table public.credit_usage_log enable row level security;

drop policy if exists "usage_log_select_own" on public.credit_usage_log;
create policy "usage_log_select_own"
  on public.credit_usage_log for select using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 5. payments  (Iyzico kayıtları — sonra doldurulacak)
-- ────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null,               -- 'subscription' | 'credit_pack'
  amount_try  numeric(10,2),
  status      text not null default 'pending',  -- 'pending' | 'success' | 'failed'
  iyzico_ref  text,
  created_at  timestamptz not null default now()
);

alter table public.payments enable row level security;

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own"
  on public.payments for select using (auth.uid() = user_id);

-- ============================================================
-- FONKSİYONLAR
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Yeni kullanıcı → profile + 10 kredilik welcome lotu (30 gün)
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.credit_lots (user_id, source, amount, remaining, expires_at)
  values (new.id, 'welcome', 10, 10, now() + interval '30 days');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- Bakiye: süresi geçmemiş lotların remaining toplamı
-- ────────────────────────────────────────────────────────────
create or replace function public.get_balance()
returns integer
language sql
security definer set search_path = public
stable
as $$
  select coalesce(sum(remaining), 0)::int
  from public.credit_lots
  where user_id = auth.uid()
    and remaining > 0
    and (expires_at is null or expires_at > now());
$$;

-- ────────────────────────────────────────────────────────────
-- Tüketim: FEFO (en erken biten önce). Atomik & kilitli.
-- Yeterli kredi yoksa hiçbir şey düşmez, false döner.
-- ────────────────────────────────────────────────────────────
create or replace function public.consume_credits(p_cost integer, p_action text)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_need     integer := p_cost;
  v_lot      record;
  v_take     integer;
begin
  if v_uid is null then
    raise exception 'Yetkisiz';
  end if;
  if p_cost <= 0 then
    raise exception 'Geçersiz maliyet';
  end if;

  -- Yeterli bakiye var mı? (kilitli okuma)
  if (
    select coalesce(sum(remaining), 0)
    from public.credit_lots
    where user_id = v_uid
      and remaining > 0
      and (expires_at is null or expires_at > now())
  ) < p_cost then
    return false;
  end if;

  -- En erken biten lottan başlayarak düş
  for v_lot in
    select id, remaining
    from public.credit_lots
    where user_id = v_uid
      and remaining > 0
      and (expires_at is null or expires_at > now())
    order by expires_at asc nulls last, granted_at asc
    for update
  loop
    exit when v_need <= 0;
    v_take := least(v_lot.remaining, v_need);
    update public.credit_lots
      set remaining = remaining - v_take
      where id = v_lot.id;
    v_need := v_need - v_take;
  end loop;

  insert into public.credit_usage_log (user_id, action, cost)
  values (v_uid, p_action, p_cost);

  return true;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- Kredi iadesi (işlem başarısız olursa): yeni kısa ömürlü lot
-- ────────────────────────────────────────────────────────────
create or replace function public.refund_credits(p_amount integer, p_action text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Yetkisiz'; end if;
  insert into public.credit_lots (user_id, source, amount, remaining, expires_at)
  values (v_uid, 'refund', p_amount, p_amount, now() + interval '30 days');
  insert into public.credit_usage_log (user_id, action, cost)
  values (v_uid, p_action || '_refund', -p_amount);
end;
$$;

-- ────────────────────────────────────────────────────────────
-- Yönetici/servis: kredi ver (abonelik yenileme, paket satın alma, manuel test)
-- Sadece service_role çağırabilir.
-- ────────────────────────────────────────────────────────────
create or replace function public.grant_credits(
  p_user uuid, p_amount integer, p_source text, p_valid_days integer
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Yalnızca service_role kredi verebilir';
  end if;
  insert into public.credit_lots (user_id, source, amount, remaining, expires_at)
  values (
    p_user, p_source, p_amount, p_amount,
    case when p_valid_days is null then null
         else now() + make_interval(days => p_valid_days) end
  );
end;
$$;

-- ────────────────────────────────────────────────────────────
-- Yönetici/servis: aboneliği etkinleştir/yenile + dönem kredisi ver
-- ────────────────────────────────────────────────────────────
create or replace function public.activate_subscription(
  p_user uuid, p_period text   -- 'monthly' | 'yearly'
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_end timestamptz;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Yalnızca service_role abonelik etkinleştirebilir';
  end if;

  v_end := case when p_period = 'yearly'
                then now() + interval '1 year'
                else now() + interval '1 month' end;

  insert into public.subscriptions (user_id, plan, status, billing_period, current_period_start, current_period_end)
  values (p_user, 'premium', 'active', p_period, now(), v_end)
  on conflict (user_id) do update
    set status = 'active',
        billing_period = excluded.billing_period,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end;

  -- Dönem kredisi: 200, dönem sonunda biter (devretmez)
  insert into public.credit_lots (user_id, source, amount, remaining, expires_at)
  values (p_user, 'subscription', 200, 200, v_end);
end;
$$;

-- Yetkilendirme: fonksiyonları authenticated/anon çağırabilsin (RLS fonksiyon içinde)
grant execute on function public.get_balance()            to anon, authenticated;
grant execute on function public.consume_credits(integer, text) to anon, authenticated;
grant execute on function public.refund_credits(integer, text)  to anon, authenticated;
-- grant_credits / activate_subscription yalnızca service_role (varsayılan) içindir.
