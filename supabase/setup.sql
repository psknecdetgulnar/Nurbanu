-- ============================================================
-- TAKBIS Okuyucu — Supabase kurulum SQL
-- Supabase Dashboard → SQL Editor'de çalıştırın.
-- ============================================================

-- 1. Profiles tablosu
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  plan        text not null default 'free',
  created_at  timestamptz not null default now()
);

-- 2. RLS: Sadece sahip okuyabilir / yazabilir
alter table public.profiles enable row level security;

create policy "Kullanıcı kendi profilini okuyabilir"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Kullanıcı kendi profilini güncelleyebilir"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Kullanıcı profil oluşturabilir"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 3. Yeni kullanıcı kaydında otomatik profil oluştur
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, plan)
  values (
    new.id,
    new.email,
    'free'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
