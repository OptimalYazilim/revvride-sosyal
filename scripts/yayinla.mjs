/*
 * Zamanı gelen gönderi ve hikâyeleri Instagram'a paylaşır (Instagram API, Instagram ile giriş).
 * GitHub Actions bunu 15 dakikada bir çalıştırır; bilgisayar açık olmak zorunda değildir.
 *
 * - Gizli anahtar: IG_TOKEN (depo > Settings > Secrets and variables > Actions).
 * - Paylaşılanlar durum/yayinlananlar.json'a yazılır; aynı öğe iki kez paylaşılmaz.
 * - Erişim anahtarı 7 günde bir yenilenir. Yenisi durum/token.json içinde, IG_TOKEN'dan türeyen
 *   anahtarla şifreli durur (AES-256-GCM); IG_TOKEN olmadan çözülemez.
 * - Günde bir kez son gönderilerin sayıları durum/istatistik.json'a yazılır (içerik ajansı buna bakar).
 *
 * Ortam: IG_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA. Deneme: KURU=1 (paylaşmaz), SIMDI=<ISO> (saati değiştirir).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const API = process.env.IG_API ?? 'https://graph.instagram.com'; // testte sahte sunucu verilebilir
const REPO = process.env.GITHUB_REPOSITORY;
const SHA = process.env.GITHUB_SHA;
const SIMDI = process.env.SIMDI ? new Date(process.env.SIMDI) : new Date();
const KURU = process.env.KURU === '1';
/** Bu kadar saatten fazla geciken öğe paylaşılmaz (sistem kapalı kaldıysa eski içerik sel gibi akmasın). */
const PENCERE_SAAT = { gonderi: 48, kaydirmali: 48, hikaye: 24 };

const okuJson = (p, varsayilan) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : varsayilan);
const yazJson = (p, v) => writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`);
const uyku = (ms) => new Promise((r) => setTimeout(r, ms));
/** Actions günlüğünde bu değeri *** olarak gizler (açık depoda günlükler herkese açıktır). */
const gizle = (deger) => console.log(`::add-mask::${deger}`);

// ------------------------------------------------------------------ erişim anahtarı
const ILK = process.env.IG_TOKEN?.trim();
if (!ILK) {
  console.log('IG_TOKEN tanımlı değil: Instagram hesabı bağlanana kadar bekleniyor.');
  process.exit(0);
}
const anahtar = () => createHash('sha256').update(ILK).digest();
const sifrele = (metin) => {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', anahtar(), iv);
  const veri = Buffer.concat([c.update(metin, 'utf8'), c.final()]);
  return { iv: iv.toString('base64'), etiket: c.getAuthTag().toString('base64'), veri: veri.toString('base64') };
};
const coz = (k) => {
  const d = createDecipheriv('aes-256-gcm', anahtar(), Buffer.from(k.iv, 'base64'));
  d.setAuthTag(Buffer.from(k.etiket, 'base64'));
  return Buffer.concat([d.update(Buffer.from(k.veri, 'base64')), d.final()]).toString('utf8');
};

let TOKEN = ILK;
let yenilendi = null;
const kayitliToken = okuJson('durum/token.json', null);
if (kayitliToken) {
  try {
    TOKEN = coz(kayitliToken);
    gizle(TOKEN);
    yenilendi = kayitliToken.yenilendi;
  } catch {
    console.log('Kayıtlı anahtar çözülemedi (IG_TOKEN değişmiş olabilir); IG_TOKEN kullanılıyor.');
  }
}

async function api(method, yol, params = {}) {
  const url = new URL(`${API}/${yol}`);
  const govde = new URLSearchParams({ ...params, access_token: TOKEN });
  let res;
  if (method === 'GET') {
    for (const [k, v] of govde) url.searchParams.set(k, v);
    res = await fetch(url);
  } else {
    res = await fetch(url, { method, body: govde });
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const e = new Error(`${method} ${yol.split('?')[0]}: ${json.error?.message ?? `HTTP ${res.status}`}`);
    e.kod = json.error?.code;
    throw e;
  }
  return json;
}

async function yenile() {
  const yasGun = yenilendi ? (SIMDI - new Date(yenilendi)) / 864e5 : Infinity;
  if (yasGun < 7) return;
  try {
    const r = await api('GET', 'refresh_access_token', { grant_type: 'ig_refresh_token' });
    gizle(r.access_token);
    TOKEN = r.access_token;
    yenilendi = SIMDI.toISOString();
    yazJson('durum/token.json', { ...sifrele(TOKEN), yenilendi, gecerlilik_gun: Math.round(r.expires_in / 86400) });
    console.log(`Erişim anahtarı yenilendi (${Math.round(r.expires_in / 86400)} gün geçerli).`);
  } catch (e) {
    // Yeni alınmış anahtar 24 saat dolmadan yenilenemez; sonraki çalışmada yeniden denenir.
    console.log(`Anahtar şimdilik yenilenmedi: ${e.message}`);
  }
}

// ------------------------------------------------------------------ paylaşım
const rawUrl = (yol) => `https://raw.githubusercontent.com/${REPO}/${SHA}/${yol.split('/').map(encodeURIComponent).join('/')}`;

async function hazirOlsun(kap) {
  for (let i = 0; i < 40; i++) {
    const s = await api('GET', kap, { fields: 'status_code' });
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`kapsayıcı durumu ${s.status_code}`);
    await uyku(3000);
  }
  throw new Error('kapsayıcı 2 dakikada hazır olmadı');
}

async function kapsayici(ig, params) {
  try {
    return (await api('POST', `${ig}/media`, params)).id;
  } catch (e) {
    // Alternatif metin alanı her hesapta kabul edilmeyebilir; gönderi onsuz da çıksın.
    if (params.alt_text && /alt_text/i.test(e.message)) {
      const { alt_text: _, ...geri } = params;
      return (await api('POST', `${ig}/media`, geri)).id;
    }
    throw e;
  }
}

async function paylas(ig, oge) {
  let kap;
  if (oge.tur === 'hikaye') {
    kap = await kapsayici(ig, { media_type: 'STORIES', image_url: rawUrl(oge.gorseller[0]) });
  } else if (oge.tur === 'gonderi') {
    kap = await kapsayici(ig, { image_url: rawUrl(oge.gorseller[0]), caption: oge.metin, ...(oge.alt ? { alt_text: oge.alt } : {}) });
  } else {
    const cocuklar = [];
    for (const g of oge.gorseller) cocuklar.push(await kapsayici(ig, { image_url: rawUrl(g), is_carousel_item: 'true' }));
    for (const c of cocuklar) await hazirOlsun(c);
    kap = await kapsayici(ig, { media_type: 'CAROUSEL', children: cocuklar.join(','), caption: oge.metin });
  }
  await hazirOlsun(kap);
  const yayin = await api('POST', `${ig}/media_publish`, { creation_id: kap });
  const bilgi = await api('GET', yayin.id, { fields: 'permalink' }).catch(() => ({}));
  return { media_id: yayin.id, permalink: bilgi.permalink ?? null };
}

// ------------------------------------------------------------------ istatistik (günde bir)
async function istatistik(ig) {
  const onceki = okuJson('durum/istatistik.json', null);
  if (onceki && SIMDI - new Date(onceki.guncellendi) < 20 * 36e5) return;
  const hesap = await api('GET', 'me', { fields: 'username,followers_count,media_count' }).catch(() => ({}));
  const medya = await api('GET', `${ig}/media`, { fields: 'id,caption,media_type,timestamp,permalink,like_count,comments_count', limit: '30' }).catch(() => ({ data: [] }));
  const kayitlar = okuJson('durum/yayinlananlar.json', {});
  const idden = Object.fromEntries(Object.entries(kayitlar).filter(([, k]) => k.media_id).map(([id, k]) => [k.media_id, id]));
  const gonderiler = [];
  for (const m of medya.data ?? []) {
    const ins = await api('GET', `${m.id}/insights`, { metric: 'reach,saved,shares,total_interactions' }).catch(() => ({ data: [] }));
    const olcu = Object.fromEntries((ins.data ?? []).map((d) => [d.name, d.values?.[0]?.value ?? d.total_value?.value ?? null]));
    gonderiler.push({
      takvim_id: idden[m.id] ?? null,
      tarih: m.timestamp,
      tur: m.media_type,
      ilk_satir: (m.caption ?? '').split('\n')[0].slice(0, 80),
      begeni: m.like_count ?? null,
      yorum: m.comments_count ?? null,
      erisim: olcu.reach ?? null,
      kaydetme: olcu.saved ?? null,
      paylasim: olcu.shares ?? null,
      etkilesim: olcu.total_interactions ?? null,
      baglanti: m.permalink,
    });
  }
  yazJson('durum/istatistik.json', {
    guncellendi: SIMDI.toISOString(),
    hesap: { kullanici: hesap.username ?? null, takipci: hesap.followers_count ?? null, gonderi_sayisi: hesap.media_count ?? null },
    gonderiler,
  });
  console.log(`İstatistik güncellendi: ${gonderiler.length} gönderi, ${hesap.followers_count ?? '?'} takipçi.`);
}

// ------------------------------------------------------------------ ana akış
const ben = await api('GET', 'me', { fields: 'user_id,username,account_type' });
if (!['BUSINESS', 'MEDIA_CREATOR'].includes(ben.account_type)) {
  console.log(`Hesap türü ${ben.account_type}: API ile paylaşım için profesyonel (İşletme ya da İçerik üreticisi) hesap gerekir.`);
  process.exit(1);
}
const IG = ben.user_id;
console.log(`Hesap: @${ben.username}`);
await yenile();

const ogeler = okuJson('icerik/takvim.json', { ogeler: [] }).ogeler;
const kayitlar = okuJson('durum/yayinlananlar.json', {});
const sirali = [...ogeler].sort((a, b) => new Date(a.zaman) - new Date(b.zaman) || a.id.localeCompare(b.id));

// Yanıtı kaybolmuş bir paylaşım ikinci kez çıkmasın: son gönderilerin metinleriyle karşılaştırılır.
const sonMetinler = new Set(
  ((await api('GET', `${IG}/media`, { fields: 'caption', limit: '25' }).catch(() => ({ data: [] }))).data ?? [])
    .map((m) => (m.caption ?? '').slice(0, 120))
    .filter(Boolean),
);

const hatalar = [];
for (const oge of sirali) {
  if (kayitlar[oge.id]) continue;
  const zaman = new Date(oge.zaman);
  if (zaman > SIMDI) continue;
  const gecikme = (SIMDI - zaman) / 36e5;
  if (!oge.gec_kalsa_da && gecikme > PENCERE_SAAT[oge.tur]) {
    kayitlar[oge.id] = { durum: 'atlandi', neden: `${Math.round(gecikme)} saat gecikti`, zaman: SIMDI.toISOString() };
    yazJson('durum/yayinlananlar.json', kayitlar);
    console.log(`Atlandı (çok gecikti): ${oge.id}`);
    continue;
  }
  if (oge.metin && sonMetinler.has(oge.metin.slice(0, 120))) {
    kayitlar[oge.id] = { durum: 'paylasildi', not: 'hesapta zaten vardı', zaman: SIMDI.toISOString() };
    yazJson('durum/yayinlananlar.json', kayitlar);
    console.log(`Zaten paylaşılmış: ${oge.id}`);
    continue;
  }
  if (KURU) {
    console.log(`[deneme] paylaşılacaktı: ${oge.id} (${oge.tur}, ${oge.gorseller.length} görsel)`);
    continue;
  }
  try {
    const r = await paylas(IG, oge);
    kayitlar[oge.id] = { durum: 'paylasildi', ...r, zaman: new Date().toISOString() };
    yazJson('durum/yayinlananlar.json', kayitlar);
    console.log(`Paylaşıldı: ${oge.id} ${r.permalink ?? ''}`);
  } catch (e) {
    hatalar.push(`${oge.id}: ${e.message}`);
    console.log(`HATA ${oge.id}: ${e.message}`);
    if (e.kod === 4 || e.kod === 9 || e.kod === 190) break; // kota ya da geçersiz anahtar: bu turu bitir
  }
}

await istatistik(IG).catch((e) => console.log(`İstatistik alınamadı: ${e.message}`));

if (hatalar.length) {
  console.log(`\n${hatalar.length} öğe paylaşılamadı; sonraki çalışmada yeniden denenecek:\n- ${hatalar.join('\n- ')}`);
  process.exit(1);
}
