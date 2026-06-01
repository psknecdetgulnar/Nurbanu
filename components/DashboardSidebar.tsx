'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_ITEMS = [
  {
    label: 'TAKBİS Okuma',
    href: '/araclar/takbis-okuyucu',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
    ),
  },
  {
    label: 'Konum Raporlama',
    href: '/araclar/konum-raporlama',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Mobil hamburger butonu ───────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="lg:hidden fixed top-3.5 left-4 z-50 p-1.5 rounded-md bg-surface-raised border border-subtle text-text-muted hover:text-on-surface transition-colors"
        aria-label="Menüyü aç/kapat"
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        )}
      </button>

      {/* ── Mobil overlay ───────────────────────────────────── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40 w-56 flex flex-col
          bg-[#0f1117] border-r border-white/[0.06]
          transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:h-auto lg:flex
        `}
      >
        {/* Logo / marka */}
        <div className="px-5 pt-6 pb-5 border-b border-white/[0.06]">
          <Link href="/" className="block">
            <span className="text-[11px] font-mono tracking-[0.2em] text-text-muted uppercase">
              Değerleme
            </span>
            <p className="text-sm font-semibold text-on-surface mt-0.5">Araçlar</p>
          </Link>
        </div>

        {/* Navigasyon */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ label, href, icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                  ${active
                    ? 'bg-white/[0.08] text-on-surface font-medium'
                    : 'text-text-muted hover:bg-white/[0.04] hover:text-on-surface-variant'
                  }
                `}
              >
                {icon}
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-white/[0.06]">
          <p className="text-[10px] font-mono text-text-muted/50 tracking-wider">v0.1</p>
        </div>
      </aside>
    </>
  );
}
