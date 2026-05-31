'use client';

import type { TakbisRecord } from '@/lib/takbis/types';

interface Props {
  records: TakbisRecord[];
}

/** Preview table shown before Excel download. Each row = one taşınmaz. */
export default function ResultTable({ records }: Props) {
  if (records.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-auto bg-white">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Doğrulama Kodu</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">İl / İlçe</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Mahalle</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Ada / Parsel</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Nitelik</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Malik(ler)</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">İpotek</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Şerh/Beyan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {records.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.dogrulamaKodu || '—'}</td>
              <td className="px-4 py-3 whitespace-nowrap">{r.il} / {r.ilce}</td>
              <td className="px-4 py-3">{r.mahalleKoy}</td>
              <td className="px-4 py-3 font-mono">{r.ada} / {r.parsel}</td>
              <td className="px-4 py-3 max-w-[180px] truncate text-xs">{r.anaTasinmazNitelik}</td>
              <td className="px-4 py-3 max-w-[200px] truncate text-xs">
                {r.malikler.map((m) => m.malik).join('; ') || '—'}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  r.ipotekVarYok === 'Var' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {r.ipotekVarYok}
                </span>
              </td>
              <td className="px-4 py-3 max-w-[200px] truncate text-xs text-gray-500">
                {r.serhBeyanOzeti || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
