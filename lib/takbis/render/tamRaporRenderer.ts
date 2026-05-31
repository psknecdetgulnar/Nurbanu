/** Tam Rapor oluşturucu — spec §7 */
import type { BelgeModel } from './types';
import { isoToDisplay } from './config';
import { renderTakyidat } from './takyidatRenderer';

const SEP1 = '═'.repeat(63);
const SEP2 = '─'.repeat(63);

export function renderTamRapor(model: BelgeModel): string {
  const { tasinmaz, malikler } = model;

  const header = [
    SEP1,
    '                    TAPU KAYIT BİLGİ RAPORU',
    SEP1,
  ].join('\n');

  const tapu = [
    '▸ TAPU KAYIT BİLGİLERİ',
    SEP2,
    `Zemin Tipi        : ${tasinmaz.zeminTipi}`,
    `İl/İlçe           : ${tasinmaz.il}/${tasinmaz.ilce}`,
    `Mahalle           : ${tasinmaz.mahalle}`,
    `Ada/Parsel        : ${tasinmaz.ada}/${tasinmaz.parsel}`,
    `Yüzölçüm (m²)     : ${tasinmaz.yuzolcum}`,
    `BB Nitelik        : ${tasinmaz.bbNitelik}`,
    `Blok/Kat/BB No    : Blok: ${tasinmaz.blok}, Kat: ${tasinmaz.kat}, BB No: ${tasinmaz.bbNo}`,
    `Arsa Pay/Payda    : ${tasinmaz.arsaPay}/${tasinmaz.arsaPayda}`,
    `Nitelik           : ${tasinmaz.anaNitelik}`,
  ].join('\n');

  const mulkiyetLines = malikler.length === 0
    ? ['• —']
    : malikler.map((m) => {
        const edinme = m.edinmeTarihi ? isoToDisplay(m.edinmeTarihi) : '-';
        return `• ${m.ad} - Hisse: ${m.hissePay}\n  Edinme: ${edinme}-${m.edinmeYevmiye}`;
      });

  const mulkiyet = [
    '▸ MÜLKİYET BİLGİLERİ',
    SEP2,
    ...mulkiyetLines,
  ].join('\n');

  const takyidat = [
    '▸ TAKYİDAT BİLGİLERİ',
    SEP2,
    renderTakyidat(model),
  ].join('\n');

  return [header, '', tapu, '', '', mulkiyet, '', '', takyidat].join('\n');
}
