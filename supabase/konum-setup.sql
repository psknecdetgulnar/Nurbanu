-- ============================================================
-- ADIM 1: Bu SQL'i Supabase Dashboard → SQL Editor'a yapıştırıp çalıştırın.
-- ============================================================

-- Kullanıcı kredi tablosu
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  remaining INTEGER NOT NULL DEFAULT 15,
  reset_date TIMESTAMPTZ NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'trial',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Premium abonelik tablosu
CREATE TABLE IF NOT EXISTS premium_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kullanım sayaç logu (içerik yok, KVKK güvenli)
CREATE TABLE IF NOT EXISTS credit_usage_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  action TEXT DEFAULT 'report_generated'
);

-- Row Level Security
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kullanıcı kendi kredisini görür" ON user_credits
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Kullanıcı kendi aboneliğini görür" ON premium_subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Kullanıcı kendi logunu görür" ON credit_usage_log
  FOR ALL USING (auth.uid() = user_id);

-- Service role'ün tablolara yazmasına izin ver (trigger fonksiyonu için)
CREATE POLICY "Service role tam erişim - credits" ON user_credits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role tam erişim - log" ON credit_usage_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- ADIM 4a: Yeni kullanıcı kaydında otomatik kredi oluştur
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, remaining, reset_date, plan_type)
  VALUES (
    NEW.id,
    15,
    NOW() + INTERVAL '14 days',
    'trial'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger: auth.users'a yeni kayıt gelince çalışır
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
