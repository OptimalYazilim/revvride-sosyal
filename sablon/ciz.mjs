/*
 * Taslakları (icerik/taslaklar/*.json) denetler, görsellerini çizer ve yayın takvimine ekler.
 * GitHub Actions'ta "Çiz" iş akışı çalıştırır; yerelde de çalışır (Chrome gerekir).
 *
 * Kullanım:
 *   node sablon/ciz.mjs              taslakları denetle, değişenleri çiz, takvime ekle
 *   node sablon/ciz.mjs --denetle    yalnızca denetle (Chrome gerekmez; içerik ajansı itmeden önce çalıştırır)
 *   node sablon/ciz.mjs --hepsi      değişmemiş olanları da yeniden çiz
 *
 * Her çalışma sonucu durum/ciz-raporu.json'a yazar (hata olsa da).
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { metinDenetle } from '../scripts/kurallar.mjs';
import { ALANLAR, ICON, boyut, kareHtml } from './sablonlar.mjs';

const KOK = resolve(import.meta.dirname, '..');
const TASLAK = join(KOK, 'icerik', 'taslaklar');
const VARLIK = join(KOK, 'sablon', 'varliklar');
const SADECE_DENETLE = process.argv.includes('--denetle');
const HEPSI = process.argv.includes('--hepsi');
const EKRANLAR = readdirSync(join(VARLIK, 'ekranlar')).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4));
const TUR_KARE = { gonderi: [1, 1], kaydirmali: [2, 10], hikaye: [1, 1] };

const okuJson = (p, v) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : v);
const yazJson = (p, v) => writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`);
const uyku = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ denetim
function denetle(t, dosya) {
  const s = [];
  if (!/^[a-z0-9-]+$/.test(t.id ?? '')) s.push('id yalnızca küçük harf, rakam ve tire içermeli');
  if (`${t.id}.json` !== dosya) s.push(`dosya adı "${t.id}.json" olmalı`);
  if (!TUR_KARE[t.tur]) return [...s, `tür "${t.tur}" geçersiz (gonderi, kaydirmali, hikaye)`];
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+03:00$/.test(t.zaman ?? '') || Number.isNaN(Date.parse(t.zaman))) s.push('zaman "2026-11-10T20:00:00+03:00" biçiminde olmalı');
  const kareler = t.kareler ?? [];
  const [en, cok] = TUR_KARE[t.tur];
  if (kareler.length < en || kareler.length > cok) s.push(`${t.tur} için ${en}–${cok} kare gerekir, ${kareler.length} var`);
  const yazilar = [];
  kareler.forEach((k, j) => {
    const yer = `kare ${j + 1}`;
    const tanim = ALANLAR[k.sablon];
    if (!tanim) return s.push(`${yer}: şablon "${k.sablon}" yok (${Object.keys(ALANLAR).join(', ')})`);
    if ((t.tur === 'hikaye') !== (k.sablon === 'hikaye')) s.push(`${yer}: hikâyede yalnızca "hikaye" şablonu, gönderide hiç kullanılmaz`);
    for (const a of tanim.zorunlu) if (k[a] === undefined || k[a] === '' || (Array.isArray(k[a]) && !k[a].length)) s.push(`${yer}: "${a}" zorunlu`);
    for (const [a, sinir] of Object.entries(tanim.sinir)) if (typeof k[a] === 'string' && k[a].length > sinir) s.push(`${yer}: "${a}" ${k[a].length} karakter (en fazla ${sinir})`);
    for (const [a, izinli] of Object.entries(tanim.secenek ?? {})) if (k[a] !== undefined && !izinli.includes(k[a])) s.push(`${yer}: "${a}" şunlardan biri olmalı: ${izinli.join(', ')}`);
    if (k.ikon && !ICON[k.ikon]) s.push(`${yer}: simge "${k.ikon}" yok`);
    if (k.ekran && !EKRANLAR.includes(k.ekran)) s.push(`${yer}: ekran "${k.ekran}" yok (${EKRANLAR.join(', ')})`);
    if (k.sablon === 'izgara') {
      if (k.ogeler.length < 3 || k.ogeler.length > 12) s.push(`${yer}: ızgarada 3–12 öğe olmalı`);
      k.ogeler.forEach((o, m) => {
        if (!ICON[o.ikon]) s.push(`${yer}, öğe ${m + 1}: simge "${o.ikon}" yok`);
        if ((o.etiket ?? '').length > 18 || !o.etiket) s.push(`${yer}, öğe ${m + 1}: etiket 1–18 karakter olmalı`);
      });
    }
    if (k.sablon === 'liste') {
      if (k.ogeler.length < 2 || k.ogeler.length > 4) s.push(`${yer}: listede 2–4 öğe olmalı`);
      k.ogeler.forEach((o, m) => {
        if (!ICON[o.ikon]) s.push(`${yer}, öğe ${m + 1}: simge "${o.ikon}" yok`);
        if (!o.baslik || o.baslik.length > 30) s.push(`${yer}, öğe ${m + 1}: başlık 1–30 karakter olmalı`);
        if (!o.metin || o.metin.length > 110) s.push(`${yer}, öğe ${m + 1}: metin 1–110 karakter olmalı`);
      });
    }
    if (k.sablon === 'hikaye' && k.maddeler && (k.maddeler.length > 5 || k.maddeler.some((x) => x.length > 30))) s.push(`${yer}: en fazla 5 madde, her biri en fazla 30 karakter`);
    yazilar.push(...Object.values(k).filter((v) => typeof v === 'string'), ...(k.maddeler ?? []), ...(k.ogeler ?? []).flatMap((o) => [o.etiket, o.baslik, o.metin].filter(Boolean)));
  });
  s.push(...metinDenetle({ metin: t.metin ?? '', ekYazilar: [t.alt ?? '', t.baslik ?? '', ...yazilar], gonderiMi: t.tur !== 'hikaye' }));
  return s;
}

// ------------------------------------------------------------------ Chrome (DevTools protokolü)
const CHROME = process.env.CHROME ?? (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : 'google-chrome');

async function chromeAc() {
  const profil = mkdtempSync(join(tmpdir(), 'revv-ciz-'));
  const port = 9400 + Math.floor(Math.random() * 400);
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--no-sandbox', '--lang=tr-TR', 'about:blank'], { stdio: 'ignore' });
  let wsUrl = null;
  for (let i = 0; i < 80 && !wsUrl; i++) {
    await uyku(250);
    try {
      const liste = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      wsUrl = liste.find((t) => t.type === 'page')?.webSocketDebuggerUrl ?? null;
    } catch {
      /* henüz açılmadı */
    }
  }
  if (!wsUrl) throw new Error(`Chrome açılmadı (${CHROME})`);
  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const bekleyen = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && bekleyen.has(m.id)) {
      const { r, j } = bekleyen.get(m.id);
      bekleyen.delete(m.id);
      m.error ? j(new Error(m.error.message)) : r(m.result);
    }
  };
  const gonder = (method, params = {}) => new Promise((r, j) => { bekleyen.set(++id, { r, j }); ws.send(JSON.stringify({ id, method, params })); });
  const calistir = async (ifade) => {
    const r = await gonder('Runtime.evaluate', { expression: ifade, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  await gonder('Page.enable');
  return {
    async ciz(html, w, h, gecici) {
      writeFileSync(gecici, html);
      await gonder('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
      await gonder('Page.navigate', { url: pathToFileURL(gecici).href });
      for (let i = 0; i < 120; i++) {
        await uyku(250);
        const hazir = await calistir(`document.readyState === 'complete' && document.body?.dataset.hazir === '1' && [...document.images].every(i => i.complete && i.naturalWidth > 0)`).catch(() => false);
        if (hazir) break;
      }
      await uyku(200);
      const tasma = await calistir(`[...document.querySelectorAll('[data-sigdir]')].filter(k => k.scrollHeight > k.clientHeight + 2 || k.scrollWidth > k.clientWidth + 2).map(k => (k.innerText || '').trim().slice(0, 60))`);
      const r = await gonder('Page.captureScreenshot', { format: 'jpeg', quality: 93 });
      return { jpeg: Buffer.from(r.data, 'base64'), tasma };
    },
    async kapat() {
      try { ws.close(); } catch { /* kapalı */ }
      proc.kill();
      await uyku(500);
      // Windows'ta Chrome kapanırken profil dosyalarını bir süre kilitli tutar; silinemezse geçici klasörde kalır.
      try { rmSync(profil, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { /* sorun değil */ }
    },
  };
}

// ------------------------------------------------------------------ ana akış
const dosyalar = existsSync(TASLAK) ? readdirSync(TASLAK).filter((f) => f.endsWith('.json')).sort() : [];
const ayarlar = okuJson(join(KOK, 'icerik', 'ayarlar.json'), {});
const rapor = { zaman: new Date().toISOString(), sonuc: {} };
const taslaklar = [];
for (const f of dosyalar) {
  let t;
  try {
    t = JSON.parse(readFileSync(join(TASLAK, f), 'utf8'));
  } catch (e) {
    rapor.sonuc[f] = `HATA: JSON okunamadı (${e.message})`;
    continue;
  }
  const s = denetle(t, f);
  if (s.length) rapor.sonuc[t.id ?? f] = `HATA: ${s.join(' | ')}`;
  else taslaklar.push(t);
}

const sablonSurumu = createHash('sha256').update(readFileSync(join(KOK, 'sablon', 'sablonlar.mjs'))).update(JSON.stringify(ayarlar)).digest('hex').slice(0, 12);
const cizim = okuJson(join(KOK, 'durum', 'cizim.json'), {});
const takvimYolu = join(KOK, 'icerik', 'takvim.json');
const takvim = okuJson(takvimYolu, { ogeler: [] });

if (!SADECE_DENETLE) {
  const yapilacak = taslaklar.filter((t) => {
    const ozet = createHash('sha256').update(JSON.stringify(t.kareler)).update(sablonSurumu).digest('hex').slice(0, 16);
    t._ozet = ozet;
    const tamam = cizim[t.id] === ozet && t.kareler.every((_, j) => existsSync(join(KOK, 'gorseller', t.id, `${j + 1}.jpg`)));
    return HEPSI || !tamam;
  });
  if (yapilacak.length) {
    const chrome = await chromeAc();
    const gecici = join(mkdtempSync(join(tmpdir(), 'revv-html-')), 'kare.html');
    try {
      for (const t of yapilacak) {
        const ctx = {
          n: t.kareler.length,
          kaydirmali: t.tur === 'kaydirmali',
          rozet: ayarlar.magaza_rozeti ?? 'Yakında App Store ve Google Play’de',
          ekran: (ad) => pathToFileURL(join(VARLIK, 'ekranlar', `${ad}.png`)).href,
          logo: (renk) => pathToFileURL(join(VARLIK, `logo-${renk}.svg`)).href,
        };
        const ciktilar = [];
        const sorunlar = [];
        for (const [j, k] of t.kareler.entries()) {
          const [w, h] = boyut(k.sablon);
          const { jpeg, tasma } = await chrome.ciz(kareHtml(k, { ...ctx, i: j + 1 }), w, h, gecici);
          if (tasma.length) sorunlar.push(`kare ${j + 1}: yazı sığmadı ("${tasma.join('", "')}"); metni kısalt`);
          ciktilar.push(jpeg);
        }
        if (sorunlar.length) {
          rapor.sonuc[t.id] = `HATA: ${sorunlar.join(' | ')}`;
          continue;
        }
        const klasor = join(KOK, 'gorseller', t.id);
        rmSync(klasor, { recursive: true, force: true });
        mkdirSync(klasor, { recursive: true });
        ciktilar.forEach((b, j) => writeFileSync(join(klasor, `${j + 1}.jpg`), b));
        cizim[t.id] = t._ozet;
        rapor.sonuc[t.id] = `çizildi (${ciktilar.length} kare)`;
        console.log(`çizildi: ${t.id}`);
      }
    } finally {
      await chrome.kapat();
    }
  }
  for (const t of taslaklar) rapor.sonuc[t.id] ??= 'değişmedi';

  // Takvim: taslaktan gelen öğeler güncellenir, elle eklenenlere dokunulmaz.
  const hazir = new Set(taslaklar.filter((t) => cizim[t.id] && !String(rapor.sonuc[t.id]).startsWith('HATA')).map((t) => t.id));
  takvim.ogeler = takvim.ogeler.filter((o) => o.kaynak !== 'taslak' || hazir.has(o.id));
  for (const t of taslaklar) {
    if (!hazir.has(t.id)) continue;
    const oge = {
      id: t.id,
      zaman: t.zaman,
      tur: t.tur,
      baslik: t.baslik ?? t.kareler[0].baslik,
      gorseller: t.kareler.map((_, j) => `gorseller/${t.id}/${j + 1}.jpg`),
      ...(t.metin ? { metin: t.metin } : {}),
      ...(t.alt ? { alt: t.alt } : {}),
      kaynak: 'taslak',
    };
    const i = takvim.ogeler.findIndex((o) => o.id === t.id);
    if (i >= 0) takvim.ogeler[i] = oge;
    else takvim.ogeler.push(oge);
  }
  takvim.ogeler.sort((a, b) => new Date(a.zaman) - new Date(b.zaman) || a.id.localeCompare(b.id));
  yazJson(takvimYolu, takvim);
  mkdirSync(join(KOK, 'durum'), { recursive: true });
  yazJson(join(KOK, 'durum', 'cizim.json'), cizim);
  yazJson(join(KOK, 'durum', 'ciz-raporu.json'), rapor);
}

const hatali = Object.entries(rapor.sonuc).filter(([, v]) => String(v).startsWith('HATA'));
for (const [id, v] of Object.entries(rapor.sonuc)) console.log(`${id}: ${v}`);
if (hatali.length) {
  console.error(`\n${hatali.length} taslakta sorun var.`);
  process.exit(1);
}
console.log(`\n${taslaklar.length} taslak${SADECE_DENETLE ? ' denetlendi' : ' hazır'}.`);
