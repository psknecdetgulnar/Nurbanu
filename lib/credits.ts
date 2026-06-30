/**
 * Kredi sistemi — lot tabanlı (bkz. supabase/schema.sql).
 *
 * Bakiye   = süresi geçmemiş lotların toplamı (get_balance RPC)
 * Tüketim  = FEFO, atomik (consume_credits RPC)
 * İade     = başarısız işlemde kısa ömürlü iade lotu (refund_credits RPC)
 *
 * Bu modül sunucu tarafında (route handler / server component) kullanılır;
 * createClient() kullanıcı oturum bağlamında çalışır, böylece auth.uid() doğru.
 */
import { createClient } from '@/lib/supabase/server';

// ── İşlem maliyetleri ────────────────────────────────────────────────────────
// Gelecekte eklenecek işlemler buraya farklı maliyetlerle eklenir.
export const CREDIT_COSTS = {
  takbis_read:     1,
  location_report: 1,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

// ── Bakiye ───────────────────────────────────────────────────────────────────

export async function getBalance(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_balance');
  if (error) {
    console.error('[credits] get_balance:', error.message);
    return 0;
  }
  return data ?? 0;
}

// ── Tüketim ──────────────────────────────────────────────────────────────────
// Yeterli kredi yoksa { ok:false }, hiçbir şey düşmez.

export interface ConsumeResult {
  ok: boolean;
  cost: number;
  balance: number;       // işlem sonrası bakiye
}

export async function consume(action: CreditAction): Promise<ConsumeResult> {
  const cost = CREDIT_COSTS[action];
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('consume_credits', {
    p_cost: cost,
    p_action: action,
  });

  if (error) {
    console.error('[credits] consume_credits:', error.message);
    return { ok: false, cost, balance: await getBalance() };
  }

  const ok = data === true;
  return { ok, cost, balance: await getBalance() };
}

// ── İade (işlem başarısız olursa) ────────────────────────────────────────────

export async function refund(action: CreditAction): Promise<void> {
  const cost = CREDIT_COSTS[action];
  const supabase = await createClient();
  const { error } = await supabase.rpc('refund_credits', {
    p_amount: cost,
    p_action: action,
  });
  if (error) console.error('[credits] refund_credits:', error.message);
}

// ── Abonelik + bakiye özeti (hesabım sayfası / read-only kontrolü) ───────────

export interface MembershipSummary {
  balance: number;
  isReadOnly: boolean;                 // balance === 0
  plan: 'free' | 'premium';
  subscriptionStatus: string | null;   // 'active' | 'past_due' | 'canceled' | null
  periodEnd: string | null;
}

export async function getMembershipSummary(): Promise<MembershipSummary> {
  const supabase = await createClient();
  const balance = await getBalance();

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .maybeSingle();

  const isActive = sub?.status === 'active';

  return {
    balance,
    isReadOnly: balance <= 0,
    plan: isActive ? 'premium' : 'free',
    subscriptionStatus: sub?.status ?? null,
    periodEnd: sub?.current_period_end ?? null,
  };
}
