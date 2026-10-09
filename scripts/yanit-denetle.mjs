/*
 * icerik/yanitlar.json'u denetler (yorum rutini itmeden önce çalıştırır; yayıncı da gönderirken aynı kuralları uygular).
 * Kullanım: node scripts/yanit-denetle.mjs
 */
import { existsSync, readFileSync } from 'node:fs';

import { metinDenetle } from './kurallar.mjs';

const kuyruk = existsSync('durum/yorumlar.json') ? JSON.parse(readFileSync('durum/yorumlar.json', 'utf8')).kuyruk ?? {} : {};
const yanitlar = existsSync('icerik/yanitlar.json') ? JSON.parse(readFileSync('icerik/yanitlar.json', 'utf8')).yanitlar ?? {} : {};

const hatalar = [];
for (const [id, y] of Object.entries(yanitlar)) {
  if (!kuyruk[id]) hatalar.push(`${id}: kuyrukta böyle bir yorum yok`);
  if (y === null || typeof y !== 'object' || !('yanit' in y)) {
    hatalar.push(`${id}: { "yanit": "..." } ya da { "yanit": null, "neden": "..." } olmalı`);
    continue;
  }
  if (y.yanit === null) {
    if (!y.neden) hatalar.push(`${id}: cevap verilmeyecekse "neden" yaz`);
    continue;
  }
  const c = String(y.yanit);
  if (!c.trim()) hatalar.push(`${id}: cevap boş`);
  if (c.length > 300) hatalar.push(`${id}: cevap ${c.length} karakter (en fazla 300)`);
  if (/#|https?:\/\/|www\./i.test(c)) hatalar.push(`${id}: cevapta etiket ya da bağlantı olmaz`);
  for (const s of metinDenetle({ metin: c, gonderiMi: false })) hatalar.push(`${id}: ${s}`);
}

if (hatalar.length) {
  console.error(`Cevaplarda ${hatalar.length} sorun var:\n- ${hatalar.join('\n- ')}`);
  process.exit(1);
}
const bekleyen = Object.entries(kuyruk).filter(([id, y]) => y.durum === 'bekliyor' && !(id in yanitlar)).length;
console.log(`Cevaplar geçerli: ${Object.keys(yanitlar).length} kayıt; cevap bekleyen yorum: ${bekleyen}.`);
