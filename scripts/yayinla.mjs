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

import { metinDenetle } from './kurallar.mjs';
import { konuBul } from './mesaj-sablonlari.mjs';

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

// ------------------------------------------------------------------ yorumlar
/*
 * Yeni yorumlar durum/yorumlar.json kuyruğuna yazılır (kullanıcı adı saklanmaz). Yorum rutini (Claude)
 * cevapları icerik/yanitlar.json'a yazar; burada denetlenip Instagram'a gönderilir. Kurallar: YORUM.md.
 */
const YORUM_GUN = 14; // bu kadar günden eski gönderilerin yorumlarına bakılmaz
const TUR_BASINA_YANIT = 20;

async function yorumlar(ig, kullanici) {
  const kayit = okuJson('durum/yorumlar.json', { izin: null, kuyruk: {} });
  const yanitlar = okuJson('icerik/yanitlar.json', { yanitlar: {} }).yanitlar ?? {};

  // 1) Rutinin yazdığı cevapları gönder.
  let gonderilen = 0;
  for (const [id, y] of Object.entries(kayit.kuyruk)) {
    if (y.durum !== 'bekliyor' || !(id in yanitlar) || gonderilen >= TUR_BASINA_YANIT) continue;
    const cevap = yanitlar[id]?.yanit ?? null;
    if (cevap === null) {
      y.durum = 'atlandi';
      y.neden = yanitlar[id]?.neden ?? null;
      continue;
    }
    const sorun = [
      ...metinDenetle({ metin: cevap, gonderiMi: false }),
      ...(cevap.length > 300 ? ['300 karakterden uzun'] : []),
      ...(/#|https?:\/\/|www\./i.test(cevap) ? ['etiket ya da bağlantı içeriyor'] : []),
    ];
    if (sorun.length) {
      y.durum = 'hata';
      y.neden = `denetim: ${sorun.join(', ')}`;
      continue;
    }
    try {
      const r = await api('POST', `${id}/replies`, { message: cevap });
      Object.assign(y, { durum: 'yanitlandi', yanit: cevap, yanit_id: r.id, yanitlanma: new Date().toISOString() });
      gonderilen++;
    } catch (e) {
      y.durum = 'hata';
      y.neden = e.message;
    }
  }
  if (gonderilen) console.log(`${gonderilen} yoruma cevap verildi.`);

  // Gizlilik: işi biten yorumun metni kayıttan silinir; 30 günden eski kayıtlar tamamen temizlenir (GIZLILIK.md).
  const otuzGun = SIMDI.getTime() - 30 * 864e5;
  for (const [id, y] of Object.entries(kayit.kuyruk)) {
    if (y.durum !== 'bekliyor') {
      delete y.metin;
      delete y.gonderi;
    }
    if (new Date(y.zaman).getTime() < otuzGun) delete kayit.kuyruk[id];
  }

  // 2) Yeni yorumları topla (30 dakikada bir yeter).
  if (!kayit.son_kontrol || SIMDI - new Date(kayit.son_kontrol) >= 29 * 60e3) {
    const sinir = SIMDI.getTime() - YORUM_GUN * 864e5;
    const medya = (await api('GET', `${ig}/media`, { fields: 'id,caption,timestamp,comments_count', limit: '25' })).data ?? [];
    let yeni = 0;
    try {
      for (const m of medya) {
        if (!m.comments_count || new Date(m.timestamp).getTime() < sinir) continue;
        const c = await api('GET', `${m.id}/comments`, { fields: 'id,text,timestamp,username,replies{username}', limit: '50' });
        for (const yorum of c.data ?? []) {
          if (kayit.kuyruk[yorum.id] || yorum.username === kullanici) continue;
          if ((yorum.replies?.data ?? []).some((r) => r.username === kullanici)) continue;
          kayit.kuyruk[yorum.id] = {
            durum: 'bekliyor',
            media_id: m.id,
            gonderi: (m.caption ?? '').split('\n')[0].slice(0, 100),
            metin: (yorum.text ?? '').slice(0, 500),
            zaman: yorum.timestamp,
          };
          yeni++;
        }
      }
      kayit.izin = true;
    } catch (e) {
      if (/permission|izin|\(#10\)|\(#200\)/i.test(e.message) || e.kod === 10 || e.kod === 200) {
        if (kayit.izin !== false) console.log(`Yorumları okuma izni yok (instagram_business_manage_comments): ${e.message}`);
        kayit.izin = false;
      } else {
        throw e;
      }
    }
    kayit.son_kontrol = SIMDI.toISOString();
    if (yeni) console.log(`${yeni} yeni yorum kuyruğa alındı.`);
  }
  yazJson('durum/yorumlar.json', kayit);
}

// ------------------------------------------------------------------ mesajlar (DM)
/*
 * Son 24 saatte gelen mesajlara konuya göre hazır cevap verir (scripts/mesaj-sablonlari.mjs).
 * Mesaj içeriği ve kişi bilgisi hiçbir yere yazılmaz; yalnızca kimliklerin özeti (hash) ve konu sayıları tutulur.
 * Sahibi elle cevap verdiyse araya girmez; aynı konuşmaya 6 saatte en fazla bir otomatik cevap gider.
 */
async function mesajlar(ig, ben) {
  const kayit = okuJson('durum/mesajlar.json', { izin: null, yanitlanan: {}, konusma: {}, sayac: {}, insan_bekleyen: 0 });
  const ozet = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 16);
  const bizim = new Set([String(ig), String(ben.id ?? '')].filter(Boolean));
  const bizdenMi = (m) => bizim.has(String(m.from?.id)) || m.from?.username === ben.username;
  const pencere = SIMDI.getTime() - 23 * 36e5; // Instagram 24 saat içinde cevaba izin verir (1 saat pay)

  let konusmalar;
  try {
    konusmalar = (await api('GET', 'me/conversations', { platform: 'instagram', fields: 'id,updated_time', limit: '25' })).data ?? [];
    kayit.izin = true;
  } catch (e) {
    if (/permission|\(#10\)|\(#200\)|\(#3\)/i.test(e.message) || [3, 10, 200].includes(e.kod)) {
      if (kayit.izin !== false) console.log(`Mesajları okuma izni yok (instagram_business_manage_messages): ${e.message}`);
      kayit.izin = false;
      yazJson('durum/mesajlar.json', kayit);
      return;
    }
    throw e;
  }

  let gonderilen = 0;
  const teshis = []; // yalnızca sayılar: içerik ya da kimlik yazılmaz
  const pencerede = konusmalar.filter((k) => new Date(k.updated_time).getTime() >= pencere).length;
  console.log(`Mesajlar: ${konusmalar.length} konuşma görünüyor, ${pencerede} tanesi son 24 saatte.`);
  kayit.gorunen = { konusma: konusmalar.length, son_24_saat: pencerede };
  for (const k of konusmalar) {
    if (new Date(k.updated_time).getTime() < pencere) continue;
    const mesajlar = (await api('GET', k.id, { fields: 'messages.limit(10){id,created_time,from,message}' })).messages?.data ?? [];
    const sirali = [...mesajlar].sort((a, b) => new Date(a.created_time) - new Date(b.created_time));
    const sonBizden = sirali.filter(bizdenMi).pop();
    const yeni = sirali.filter(
      (m) =>
        !bizdenMi(m) &&
        new Date(m.created_time).getTime() >= pencere &&
        (!sonBizden || new Date(m.created_time) > new Date(sonBizden.created_time)) &&
        !kayit.yanitlanan[ozet(m.id)],
    );
    teshis.push({
      mesaj: sirali.length,
      metinli: sirali.filter((m) => (m.message ?? '').trim()).length,
      kimden_var: sirali.filter((m) => m.from?.id).length,
      bizden: sirali.filter(bizdenMi).length,
      yeni: yeni.length,
      alanlar: [...new Set(sirali.flatMap((m) => Object.keys(m)))].sort(),
    });
    if (!yeni.length) continue;
    const isaretle = () => yeni.forEach((m) => (kayit.yanitlanan[ozet(m.id)] = SIMDI.toISOString()));
    const kOzet = ozet(k.id);
    const metin = yeni.map((m) => m.message ?? '').filter(Boolean).join('\n');
    if (!metin.trim()) continue; // metin yok (tepki, ek ya da henüz okunamayan istek): işaretlemeden geç, sonra yeniden bakılır
    const konu = konuBul(metin);
    // Aynı konuşmada: aynı konuya 6 saatte bir, günde en fazla 3 otomatik cevap (botlarla karşılıklı döngüye girmesin).
    const gun = SIMDI.toISOString().slice(0, 10);
    const onceki = typeof kayit.konusma[kOzet] === 'object' ? kayit.konusma[kOzet] : null;
    const bugunku = onceki?.gun === gun ? onceki.sayi : 0;
    const ayniKonuYakin = onceki && onceki.konu === konu.ad && SIMDI - new Date(onceki.zaman) < 6 * 36e5;
    if (ayniKonuYakin || bugunku >= 3) {
      isaretle();
      continue;
    }
    const sorun = metinDenetle({ metin: konu.cevap, gonderiMi: false });
    if (sorun.length) {
      console.log(`Mesaj şablonu "${konu.ad}" denetimden geçmedi: ${sorun.join(', ')}`);
      continue;
    }
    if (KURU) {
      console.log(`[deneme] mesaja "${konu.ad}" cevabı gidecekti.`);
      continue;
    }
    try {
      const kisi = yeni[yeni.length - 1].from.id;
      await api('POST', `${ig}/messages`, { recipient: JSON.stringify({ id: kisi }), message: JSON.stringify({ text: konu.cevap }) });
      isaretle();
      kayit.konusma[kOzet] = { zaman: SIMDI.toISOString(), konu: konu.ad, gun, sayi: bugunku + 1 };
      kayit.sayac[konu.ad] = (kayit.sayac[konu.ad] ?? 0) + 1;
      if (konu.insan) kayit.insan_bekleyen = (kayit.insan_bekleyen ?? 0) + 1;
      gonderilen++;
    } catch (e) {
      console.log(`Mesaja cevap gönderilemedi (${konu.ad}): ${e.message}`);
      if (sinirHatasi(e)) break;
    }
  }

  // Bir haftadan eski özetler silinir; dosya küçük kalsın.
  const hafta = SIMDI.getTime() - 7 * 864e5;
  for (const [a, z] of Object.entries(kayit.yanitlanan)) if (new Date(z).getTime() < hafta) delete kayit.yanitlanan[a];
  for (const [a, v] of Object.entries(kayit.konusma)) if (new Date(v?.zaman ?? v).getTime() < hafta) delete kayit.konusma[a];
  kayit.son_kontrol = SIMDI.toISOString();
  kayit.son_teshis = teshis;
  yazJson('durum/mesajlar.json', kayit);
  if (gonderilen) console.log(`${gonderilen} mesaja otomatik cevap verildi.`);
}

// ------------------------------------------------------------------ ana akış
const ben = await api('GET', 'me', { fields: 'id,user_id,username,account_type' });
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

// Instagram "çok fazla işlem" derse bir süre hiç paylaşım denenmez (hesabı kısıtlamaya sokmamak için).
const BEKLEME_SAAT = 3;
const bekleme = okuJson('durum/bekleme.json', null);
const beklemede = bekleme && new Date(bekleme.kadar) > SIMDI;
if (beklemede) console.log(`Instagram sınırı nedeniyle ${bekleme.kadar} zamanına kadar paylaşım yapılmıyor.`);
const sinirHatasi = (e) => /too many actions|request limit|rate limit|çok fazla/i.test(e.message) || [4, 9, 17, 32, 613].includes(e.kod);

const hatalar = [];
for (const oge of beklemede ? [] : sirali) {
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
    console.log(`HATA ${oge.id}: ${e.message}`);
    if (sinirHatasi(e)) {
      const kadar = new Date(SIMDI.getTime() + BEKLEME_SAAT * 36e5).toISOString();
      yazJson('durum/bekleme.json', { kadar, neden: e.message });
      console.log(`Instagram sınırı: ${BEKLEME_SAAT} saat paylaşım yapılmayacak (${kadar}).`);
      break; // sınır bir hata değil, bekleme: çalışma başarılı sayılır
    }
    hatalar.push(`${oge.id}: ${e.message}`);
    if (e.kod === 190) break; // geçersiz anahtar: bu turu bitir
  }
}

await istatistik(IG).catch((e) => console.log(`İstatistik alınamadı: ${e.message}`));
await yorumlar(IG, ben.username).catch((e) => console.log(`Yorumlar işlenemedi: ${e.message}`));
if (!beklemede) await mesajlar(IG, ben).catch((e) => console.log(`Mesajlar işlenemedi: ${e.message}`));

if (hatalar.length) {
  console.log(`\n${hatalar.length} öğe paylaşılamadı; sonraki çalışmada yeniden denenecek:\n- ${hatalar.join('\n- ')}`);
  process.exit(1);
}
