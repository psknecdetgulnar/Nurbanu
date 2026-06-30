import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getMembershipSummary } from '@/lib/credits';

export const dynamic = 'force-dynamic';

const SOURCE_LABEL: Record<string, string> = {
  welcome:      'Hoş geldin kredisi',
  subscription: 'Abonelik kredisi',
  purchase:     'Satın alınan paket',
  refund:       'İade',
};

const ACTION_LABEL: Record<string, string> = {
  takbis_read:            'TAKBİS okuma',
  location_report:        'Konum raporu',
  takbis_read_refund:     'TAKBİS okuma (iade)',
  location_report_refund: 'Konum raporu (iade)',
};

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function HesabimPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const summary = await getMembershipSummary();

  const { data: lots } = await supabase
    .from('credit_lots')
    .select('source, remaining, amount, expires_at')
    .gt('remaining', 0)
    .order('expires_at', { ascending: true, nullsFirst: false });

  const activeLots = (lots ?? []).filter(
    (l) => !l.expires_at || new Date(l.expires_at) > new Date()
  );

  const { data: usage } = await supabase
    .from('credit_usage_log')
    .select('action, cost, used_at')
    .order('used_at', { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen bg-surface-base text-on-surface">
      {/* Header */}
      <header className="bg-surface-raised border-b border-subtle sticky top-0 z-10">
        <div className="max-w-[900px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/araclar/takbis-okuyucu" className="text-xs font-mono text-text-muted hover:text-on-surface transition-colors tracking-wider">
              ← ARAÇLAR
            </Link>
            <span className="text-subtle text-xs text-outline">/</span>
            <span className="text-xs font-mono text-on-surface-variant tracking-wider">HESABIM</span>
          </div>
          <span className="text-xs font-mono text-text-muted hidden sm:block">{user.email}</span>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-6 lg:px-10 py-10 space-y-8">

        {/* Özet kartları */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-surface-raised border border-subtle rounded-xl p-5">
            <p className="text-xs font-mono text-text-muted tracking-wider uppercase mb-1">Bakiye</p>
            <p className={`text-3xl font-geist font-semibold ${summary.balance <= 0 ? 'text-orange-400' : 'text-on-surface'}`}>
              {summary.balance}
            </p>
            <p className="text-xs text-text-muted mt-1">kredi</p>
          </div>
          <div className="bg-surface-raised border border-subtle rounded-xl p-5">
            <p className="text-xs font-mono text-text-muted tracking-wider uppercase mb-1">Plan</p>
            <p className="text-2xl font-geist font-semibold text-on-surface">
              {summary.plan === 'premium' ? 'Premium' : 'Ücretsiz'}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {summary.plan === 'premium' ? `Yenileme: ${fmtDate(summary.periodEnd)}` : 'Abonelik yok'}
            </p>
          </div>
          <div className="bg-surface-raised border border-subtle rounded-xl p-5">
            <p className="text-xs font-mono text-text-muted tracking-wider uppercase mb-1">Durum</p>
            <p className="text-2xl font-geist font-semibold text-on-surface">
              {summary.isReadOnly ? 'Salt-okunur' : 'Aktif'}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {summary.isReadOnly ? 'Kredi ekleyin' : 'Araçları kullanabilirsiniz'}
            </p>
          </div>
        </div>

        {summary.isReadOnly && (
          <div className="bg-orange-400/10 border border-orange-400/20 text-orange-400 rounded-xl px-5 py-4 text-sm">
            Krediniz bitti. İşlem yapabilmek için Premium abonelik başlatın veya ek kredi paketi alın.
            <span className="text-text-muted"> (Ödeme entegrasyonu yakında.)</span>
          </div>
        )}

        {/* Kredi lotları */}
        <section>
          <h2 className="text-sm font-geist font-semibold text-on-surface mb-3">Kredilerim</h2>
          {activeLots.length === 0 ? (
            <p className="text-sm text-text-muted">Aktif krediniz bulunmuyor.</p>
          ) : (
            <div className="border border-subtle rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-raised text-text-muted text-xs font-mono uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-2.5">Kaynak</th>
                    <th className="text-right px-4 py-2.5">Kalan</th>
                    <th className="text-right px-4 py-2.5">Son kullanma</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLots.map((l, i) => (
                    <tr key={i} className="border-t border-subtle">
                      <td className="px-4 py-2.5">{SOURCE_LABEL[l.source] ?? l.source}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{l.remaining}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-text-muted">{fmtDate(l.expires_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Kullanım geçmişi */}
        <section>
          <h2 className="text-sm font-geist font-semibold text-on-surface mb-3">Son işlemler</h2>
          {(!usage || usage.length === 0) ? (
            <p className="text-sm text-text-muted">Henüz işlem yok.</p>
          ) : (
            <div className="border border-subtle rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-raised text-text-muted text-xs font-mono uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-2.5">İşlem</th>
                    <th className="text-right px-4 py-2.5">Kredi</th>
                    <th className="text-right px-4 py-2.5">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map((u, i) => (
                    <tr key={i} className="border-t border-subtle">
                      <td className="px-4 py-2.5">{ACTION_LABEL[u.action] ?? u.action}</td>
                      <td className={`px-4 py-2.5 text-right font-mono ${u.cost < 0 ? 'text-secondary' : 'text-text-muted'}`}>
                        {u.cost < 0 ? `+${-u.cost}` : `-${u.cost}`}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-text-muted">
                        {new Date(u.used_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
