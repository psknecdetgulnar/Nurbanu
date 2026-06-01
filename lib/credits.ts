import { createClient } from '@/lib/supabase/server';

// ── Tipler ──────────────────────────────────────────────────────────────────

export interface CreditStatus {
  canUse: boolean;
  remaining: number;
  planType: string;
  isExpired: boolean;
  resetDate: Date;
}

// ── Kullanıcı kredi durumu ───────────────────────────────────────────────────

export async function getUserCreditStatus(userId: string): Promise<CreditStatus> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_credits')
    .select('remaining, plan_type, reset_date')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { canUse: false, remaining: 0, planType: 'trial', isExpired: true, resetDate: new Date() };
  }

  const resetDate = new Date(data.reset_date);
  const now       = new Date();

  // Trial süresi dolmuş mu?
  const isTrialExpired = data.plan_type === 'trial' && resetDate < now;

  const canUse = !isTrialExpired && data.remaining > 0;

  return {
    canUse,
    remaining: data.remaining,
    planType:  data.plan_type,
    isExpired: isTrialExpired,
    resetDate,
  };
}

// ── Kredi düş, log yaz ──────────────────────────────────────────────────────

export async function consumeCredit(userId: string): Promise<boolean> {
  const supabase = await createClient();

  // Önce mevcut durumu kontrol et
  const status = await getUserCreditStatus(userId);
  if (!status.canUse) return false;

  // Krediyi 1 düşür (remaining >= 1 garantisini sağla)
  const { error: updateError } = await supabase
    .from('user_credits')
    .update({ remaining: status.remaining - 1 })
    .eq('user_id', userId)
    .gte('remaining', 1);  // race condition koruması

  if (updateError) return false;

  // Kullanım loguna yaz (KVKK: sadece sayaç, içerik yok)
  await supabase
    .from('credit_usage_log')
    .insert({ user_id: userId, action: 'report_generated' });

  return true;
}

// ── Başarısız üretimde krediyi iade et (rollback) ───────────────────────────

export async function refundCredit(userId: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_credits')
    .select('remaining')
    .eq('user_id', userId)
    .single();
  if (data) {
    await supabase
      .from('user_credits')
      .update({ remaining: data.remaining + 1 })
      .eq('user_id', userId);
  }
}

// ── Aylık reset kontrolü ────────────────────────────────────────────────────

export async function checkAndResetCredits(userId: string): Promise<void> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_credits')
    .select('plan_type, reset_date')
    .eq('user_id', userId)
    .single();

  if (!data || data.plan_type === 'trial') return;

  const resetDate = new Date(data.reset_date);
  const now       = new Date();

  if (now >= resetDate) {
    // Bir sonraki reset gününü hesapla (aynı gün, bir ay sonra)
    const nextReset = new Date(resetDate);
    nextReset.setMonth(nextReset.getMonth() + 1);

    // Ay sonu edge case: hedef günü geç ay için son güne sıkıştır
    const targetDay = resetDate.getDate();
    const maxDay    = new Date(nextReset.getFullYear(), nextReset.getMonth() + 1, 0).getDate();
    nextReset.setDate(Math.min(targetDay, maxDay));

    await supabase
      .from('user_credits')
      .update({ remaining: 30, reset_date: nextReset.toISOString() })
      .eq('user_id', userId);
  }
}
