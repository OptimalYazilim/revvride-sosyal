/*
 * icerik/takvim.json'u ve görselleri denetler; bir kural bozulursa hata verir (yayın da durur).
 * Kullanım: node scripts/dogrula.mjs
 *
 * Kurallar AJANS.md ile aynıdır: en fazla 5 etiket, uygulamada olmayan vaat yok, radar/polis yok,
 * SOS geçen metinde 112 uyarısı, görseller JPEG ve doğru boyutta.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';

import { metinDenetle } from './kurallar.mjs';

const TURLER = { gonderi: [1, 1], kaydirmali: [2, 10], hikaye: [1, 1] };
const BOYUT = { gonderi: [[1080, 1350], [1080, 1080]], kaydirmali: [[1080, 1350], [1080, 1080]], hikaye: [[1080, 1920]] };

/** JPEG'in genişlik ve yüksekliği (SOF işaretinden). */
function jpegBoyut(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const isaret = buf[i + 1];
    const uzunluk = buf.readUInt16BE(i + 2);
    if (isaret >= 0xc0 && isaret <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(isaret)) {
      return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    }
    i += 2 + uzunluk;
  }
  return null;
}

const hatalar = [];
const hata = (id, mesaj) => hatalar.push(`${id}: ${mesaj}`);

const { ogeler } = JSON.parse(readFileSync('icerik/takvim.json', 'utf8'));
const goruldu = new Set();
for (const o of ogeler) {
  const id = o.id ?? '(id yok)';
  if (!/^[a-z0-9-]+$/.test(id)) hata(id, 'id yalnızca küçük harf, rakam ve tire içermeli');
  if (goruldu.has(id)) hata(id, 'aynı id iki kez var');
  goruldu.add(id);
  if (!TURLER[o.tur]) {
    hata(id, `tür "${o.tur}" geçersiz (gonderi, kaydirmali, hikaye)`);
    continue;
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?\+03:00$/.test(o.zaman ?? '') || Number.isNaN(Date.parse(o.zaman))) {
    hata(id, 'zaman "2026-10-13T20:00:00+03:00" biçiminde olmalı (İstanbul saati)');
  }
  const [en, cok] = TURLER[o.tur];
  const g = o.gorseller ?? [];
  if (g.length < en || g.length > cok) hata(id, `${o.tur} için ${en}–${cok} görsel gerekir, ${g.length} var`);
  let ilkBoyut = null;
  for (const yol of g) {
    if (!/^gorseller\/[a-z0-9-]+\/[0-9]+\.jpg$/.test(yol)) hata(id, `görsel yolu "${yol}" gorseller/<id>/<sıra>.jpg biçiminde olmalı`);
    if (!existsSync(yol)) {
      hata(id, `görsel yok: ${yol}`);
      continue;
    }
    if (statSync(yol).size > 8 * 1024 * 1024) hata(id, `${yol} 8 MB'tan büyük`);
    const b = jpegBoyut(readFileSync(yol));
    if (!b) {
      hata(id, `${yol} JPEG değil (Instagram API yalnızca JPEG kabul eder)`);
      continue;
    }
    if (!BOYUT[o.tur].some(([w, h]) => w === b[0] && h === b[1])) hata(id, `${yol} boyutu ${b.join('×')}; ${o.tur} için ${BOYUT[o.tur].map((x) => x.join('×')).join(' ya da ')}`);
    if (ilkBoyut && ilkBoyut.join() !== b.join()) hata(id, 'kaydırmalı gönderide bütün görseller aynı boyutta olmalı');
    ilkBoyut ??= b;
  }
  for (const s of metinDenetle({ metin: o.metin ?? '', ekYazilar: [o.alt ?? '', o.baslik ?? ''], gonderiMi: o.tur !== 'hikaye' })) hata(id, s);
}

if (hatalar.length) {
  console.error(`Takvimde ${hatalar.length} sorun var:\n- ${hatalar.join('\n- ')}`);
  process.exit(1);
}
console.log(`Takvim geçerli: ${ogeler.length} öğe.`);
