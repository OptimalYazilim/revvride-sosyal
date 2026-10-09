/* Metin kuralları: dogrula.mjs ve sablon/ciz.mjs birlikte kullanır. Gerekçeler AJANS.md'de. */

export const YASAK = [
  [/ücretsiz|bedava/i, 'fiyat vaadi (fiyat kararı verilmedi)'],
  [/radar|polis|jandarma/i, 'radar/polis içeriği sosyal medyada yok'],
  [/kaza(yı)?\s*algıla|düşme\s*algıla|otomatik\s*(sos|yardım)/i, 'kaza algılama uygulamada yok'],
  [/ekran\s*kapalı/i, 'ekran kapalıyken kayıt uygulamada yok'],
  [/%\s*100\s*güvenli|kazasız|hayat kurtar/i, 'abartılı güvenlik vaadi'],
];

/** Gönderi metni ve görsel yazıları için ortak denetim; hata mesajlarını döner. */
export function metinDenetle({ metin = '', ekYazilar = [], gonderiMi = true }) {
  const sorunlar = [];
  if (gonderiMi) {
    if (!metin.trim()) sorunlar.push('gönderi metni boş');
    if (metin.length > 2200) sorunlar.push(`metin ${metin.length} karakter (en fazla 2200)`);
    const etiketler = metin.match(/#[\p{L}\p{N}_]+/gu) ?? [];
    if (etiketler.length > 5) sorunlar.push(`${etiketler.length} etiket var; Instagram en fazla 5 kabul eder`);
  }
  const hepsi = [metin, ...ekYazilar].join(' ');
  if (/\bSOS\b/.test(hepsi) && !hepsi.includes('112')) sorunlar.push('SOS geçiyorsa "112\'nin yerine geçmez" uyarısı da olmalı');
  for (const [re, neden] of YASAK) if (re.test(hepsi)) sorunlar.push(`yasak ifade (${neden}): "${hepsi.match(re)[0]}"`);
  return sorunlar;
}
