/*
 * Görsel şablonları: her kare bir şablon adı ve alanlarıyla tarif edilir (icerik/taslaklar/*.json),
 * burada HTML'e çevrilir, ciz.mjs başsız Chrome'da JPEG'e çizer.
 *
 * Yazı kutuları data-sigdir taşır: yazı sığmazsa başlık küçültülür; yine sığmazsa çizim hata verir.
 * Alan sınırları ALANLAR'da; AJANS.md şablonları örnekleriyle anlatır.
 */

export const ORANGE = '#FF3600';
const INK = '#18181b';

/** 24×24 çizgi simgeleri (uygulamanın simge diliyle aynı). */
export const ICON = {
  alert: 'M12 4 21 20H3z M12 10v4.5 M12 17.5h.01',
  route: 'M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M18 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M8 18h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20c1.1-3.3 3.6-5 6.5-5s5.4 1.7 6.5 5 M16 4.3a3.5 3.5 0 0 1 0 6.4 M18 15.3c1.6.7 2.8 2.3 3.5 4.7',
  shield: 'M12 3l7.5 3v6c0 4.6-3.1 7.7-7.5 9.2C7.6 19.7 4.5 16.6 4.5 12V6z',
  helmet: 'M4 17v-1a8 8 0 0 1 16 0v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M11 12h8.4 M11 12V8.2',
  headphones: 'M4 15v-3a8 8 0 0 1 16 0v3 M4 15h3v5.5H5a1 1 0 0 1-1-1z M20 15h-3v5.5h2a1 1 0 0 0 1-1z',
  volume: 'M4 9.5h3.5L13 5v14l-5.5-4.5H4z M16.5 9a4.5 4.5 0 0 1 0 6 M19 6.5a8 8 0 0 1 0 11',
  mic: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z M6 11a6 6 0 0 0 12 0 M12 17v4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  flag: 'M5 21V4 M5 4.5h11.5l-2 4 2 4H5',
  pin: 'M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  phone: 'M5.5 4h3.5l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v3.5a2 2 0 0 1-2 2A16 16 0 0 1 3.5 6a2 2 0 0 1 2-2z',
  motorcycle: 'M5.5 19a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M18.5 19a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M5.5 15.5l4-6h5.5l3.5 6 M9.5 9.5 8 6.5H5.5 M15 9.5l1.5-3H19 M9.5 15.5h5',
  leaf: 'M5 19c0-8 5-13 15-14-1 10-6 15-14 15z M5 19l8-8',
  thermometer: 'M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z M12 11v6.5',
  fog: 'M6 13a4 4 0 0 1 .8-7.9A5 5 0 0 1 16.6 6 3.5 3.5 0 0 1 18 13z M4 17h16 M7 21h10',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  layers: 'M12 3 2 8l10 5 10-5z M2 12.5l10 5 10-5 M2 17l10 5 10-5',
  manhole: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M7 9h10 M5.5 12h13 M7 15h10',
  bluetooth: 'M7 7l10 10-5 5V2l5 5L7 17',
  coffee: 'M17 8h1a4 4 0 1 1 0 8h-1 M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z M6 2v2 M10 2v2 M14 2v2',
  tag: 'M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z M7.5 7.5h.01',
  umbrella: 'M3 12a9 9 0 0 1 18 0z M12 12v7a2 2 0 0 0 4 0',
  wrench: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z',
  hand: 'M18 11V6a2 2 0 0 0-4 0 M14 10V4a2 2 0 0 0-4 0v2 M10 10.5V6a2 2 0 0 0-4 0v8 M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15',
  zigzag: 'M7 3v3 M17 7v3 M7 11v3 M17 15v3 M7 19v2',
  battery: 'M3 7h15v10H3z M21 10v4 M11.5 9l-2 3h3l-2 3',
  fuel: 'M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16 M3 21h12 M7 8h4 M14 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3',
  gauge: 'M12 21a9 9 0 1 1 9-9 M12 12l4.5-4.5 M12 21h9',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  droplet: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  snowflake: 'M12 2v20 M3.3 7l17.4 10 M3.3 17 20.7 7 M9 4l3 2 3-2 M9 20l3-2 3 2',
  wind: 'M12.8 19.6A2 2 0 1 0 14 16H2 M17.5 8a2.5 2.5 0 1 1 2 4H2 M9.8 4.4A2 2 0 1 1 11 8H2',
  pothole: 'M3 14c0-2 4-3.5 9-3.5s9 1.5 9 3.5-4 3.5-9 3.5-9-1.5-9-3.5z M7 14.3c2 .9 6 .9 9.5-.3',
  gravel: 'M5 15h.01 M9 13h.01 M13 16h.01 M17 13.5h.01 M7 18.5h.01 M11 19.5h.01 M15 19h.01 M19 17.5h.01 M3 22h18',
  debris: 'M21 8 12 3 3 8v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8',
  paw: 'M12 13c-3 0-5 3-5 5.5A2.5 2.5 0 0 0 9.5 21h5a2.5 2.5 0 0 0 2.5-2.5c0-2.5-2-5.5-5-5.5z M5.5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M9.5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M14.5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M18.5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  cone: 'M5 21h14 M10 3h4l4.5 18h-13z M8.3 10h7.4 M6.9 15.5h10.2',
  bell: 'M6 10a6 6 0 0 1 12 0c0 5.5 2.5 7 2.5 7h-17S6 15.5 6 10z M10 20.5a2.2 2.2 0 0 0 4 0',
  lock: 'M6 11h12v9.5H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  calendar: 'M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z M9 4v14 M15 6v14',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  camera: 'M4 7h3l2-3h6l2 3h3v13H4z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  heart: 'M12 20s-7.5-4.6-9.2-9.3C1.6 7.4 3.7 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.3 0 5.4 3.4 4.2 6.7C19.5 15.4 12 20 12 20z',
};

/** Alanlar ve en fazla karakter sayıları (doğrulamada kullanılır). */
export const ALANLAR = {
  kapak: { zorunlu: ['baslik'], sinir: { etiket: 22, baslik: 44, metin: 140 }, secenek: { zemin: ['koyu', 'turuncu', 'acik'] } },
  ipucu: { zorunlu: ['baslik', 'metin', 'ikon'], sinir: { no: 3, baslik: 50, metin: 220, not: 110 } },
  kapanis: { zorunlu: ['baslik'], sinir: { baslik: 44, metin: 170 }, secenek: { zemin: ['turuncu', 'koyu'] } },
  izgara: { zorunlu: ['baslik', 'ogeler'], sinir: { baslik: 44 }, secenek: { zemin: ['turuncu', 'acik'] } },
  liste: { zorunlu: ['ogeler'], sinir: {} },
  alinti: { zorunlu: ['baslik', 'alinti', 'ekran'], sinir: { baslik: 32, kart_etiketi: 22, alinti: 70, metin: 110 }, secenek: { zemin: ['acik', 'turuncu', 'koyu'] } },
  soru: { zorunlu: ['baslik'], sinir: { baslik: 60, metin: 120, rozet: 24 } },
  'ozel-gun': { zorunlu: ['buyuk', 'baslik'], sinir: { buyuk: 12, baslik: 60, alt: 30 }, secenek: { renk: ['kirmizi', 'koyu', 'turuncu'] } },
  hikaye: { zorunlu: ['baslik'], sinir: { etiket: 22, baslik: 50, metin: 150 }, secenek: { zemin: ['turuncu', 'koyu'] } },
};

const BG = {
  turuncu: `radial-gradient(130% 80% at 15% 0%, #ff6b2c 0%, #ff3600 48%, #c22c00 100%)`,
  koyu: `radial-gradient(120% 70% at 85% 100%, #3a1205 0%, #141416 55%, #0b0b0d 100%)`,
  acik: `linear-gradient(170deg, #fff7f2 0%, #ffe9dd 100%)`,
  kirmizi: `radial-gradient(120% 80% at 20% 0%, #f0303c 0%, #e30a17 50%, #a8000c 100%)`,
};
const koyuMu = (z) => z !== 'acik';
const kac = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const icon = (name, size, color, stroke = 2) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[name]}"/></svg>`;

const road = (w, h, color = '#fff', opacity = 1) => {
  const d = `M${-0.1 * w} ${0.7 * h} C ${0.25 * w} ${0.55 * h}, ${0.35 * w} ${0.95 * h}, ${0.65 * w} ${0.82 * h} S ${1.05 * w} ${0.6 * h}, ${1.15 * w} ${0.66 * h}`;
  return `<svg style="position:absolute;inset:0;width:100%;height:100%;opacity:${opacity}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
  <path d="${d}" stroke="${color}" stroke-width="${0.06 * w}" fill="none" opacity="0.07"/>
  <path d="${d}" stroke="${color}" stroke-width="${0.007 * w}" stroke-dasharray="${0.035 * w} ${0.035 * w}" fill="none" opacity="0.35"/></svg>`;
};

/** Sığmayan başlığı adım adım küçültür; çizim sonrası taşma denetimi ciz.mjs'de. */
const SIGDIR = `<script>
  document.fonts.ready.then(() => {
    for (const kutu of document.querySelectorAll('[data-sigdir]')) {
      const h = kutu.querySelector('h1');
      if (!h) continue;
      let boy = parseFloat(getComputedStyle(h).fontSize);
      const en_az = boy * 0.62;
      while ((kutu.scrollHeight > kutu.clientHeight + 1 || kutu.scrollWidth > kutu.clientWidth + 1) && boy > en_az) {
        boy -= 3;
        h.style.fontSize = boy + 'px';
      }
    }
    document.body.dataset.hazir = '1';
  });
</script>`;

function page(w, h, bg, body) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box} html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}
  body{position:relative;font-family:Inter,'Segoe UI',sans-serif;background:${bg};color:#fff;-webkit-font-smoothing:antialiased}
  h1{margin:0;font-weight:900;letter-spacing:-0.035em;line-height:1.02;text-wrap:balance}
  p{margin:0;font-weight:500;line-height:1.32;text-wrap:pretty}
  .abs{position:absolute} .col{display:flex;flex-direction:column}
  [data-sigdir]{overflow:hidden}
  .phone{position:absolute;padding:14px;background:#0b0b0d;border-radius:64px;box-shadow:0 40px 90px rgba(40,8,0,.5), inset 0 0 0 3px #2a2a2e}
  .phone img{display:block;width:100%;border-radius:50px}
  .pill{display:inline-flex;align-items:center;gap:14px;border-radius:999px;font-weight:700;white-space:nowrap}
  .tag{display:inline-block;padding:12px 26px;border-radius:999px;font-weight:800;letter-spacing:.08em;font-size:26px}
  .card{background:#fff;color:${INK};box-shadow:0 18px 40px rgba(60,10,0,.22)}
</style></head><body>${body}${SIGDIR}</body></html>`;
}

/**
 * Bir kareyi HTML'e çevirir.
 * ctx: { i, n (karenin sırası/sayısı), kaydirmali (bool), rozet (mağaza yazısı), ekran(ad)→url, logo(beyaz|turuncu)→url }
 */
export function kareHtml(k, ctx) {
  const W = 1080;
  const H = 1350;
  const sayac = (z) => (ctx.n > 1 ? `<div class="abs" style="right:80px;top:84px;font-weight:800;font-size:26px;letter-spacing:.06em;padding:12px 22px;border-radius:999px;background:${koyuMu(z) ? 'rgba(255,255,255,.16)' : 'rgba(255,54,0,.1)'};color:${koyuMu(z) ? '#fff' : ORANGE}">${ctx.i}/${ctx.n}</div>` : '');
  const logo = (z, stil) => `<img class="abs" src="${ctx.logo(koyuMu(z) ? 'beyaz' : 'turuncu')}" style="${stil}">`;
  const telefon = (ad, o) =>
    `<div class="phone" style="${o.left !== undefined ? `left:${o.left}px;` : ''}${o.right !== undefined ? `right:${o.right}px;` : ''}top:${o.top}px;width:${o.width}px;transform:rotate(${o.rotate ?? 0}deg)"><img src="${ctx.ekran(ad)}"></div>`;
  const rozet = (renk, zemin, boy = 28) => `<div><span class="pill" style="padding:20px 28px;background:${zemin};color:${renk};font-size:${boy}px">${kac(ctx.rozet)}</span></div>`;

  switch (k.sablon) {
    case 'kapak': {
      const z = k.zemin ?? 'koyu';
      const genis = k.ekran ? 560 : 900;
      return page(W, H, BG[z], `${road(W, H, z === 'turuncu' ? '#fff' : ORANGE, z === 'acik' ? 0.9 : 1)}${sayac(z)}
        <div class="abs col" data-sigdir style="left:80px;top:84px;width:${genis}px;bottom:200px;gap:34px">
          ${k.etiket ? `<div><span class="tag" style="background:${koyuMu(z) ? 'rgba(255,255,255,.18)' : 'rgba(255,54,0,.12)'};color:${koyuMu(z) ? '#fff' : ORANGE}">${kac(k.etiket)}</span></div>` : ''}
          <h1 style="font-size:${k.ekran ? 104 : 136}px;color:${koyuMu(z) ? '#fff' : INK}">${kac(k.baslik)}</h1>
          ${k.metin ? `<p style="font-size:38px;color:${koyuMu(z) ? 'rgba(255,255,255,.9)' : '#3f3f46'}">${kac(k.metin)}</p>` : ''}
        </div>
        ${k.ekran ? telefon(k.ekran, { right: -60, top: 360, width: 440, rotate: 6 }) : ''}
        ${!k.ekran && k.ikon ? `<div class="abs" style="right:80px;bottom:200px;width:300px;height:300px;border-radius:90px;background:${koyuMu(z) ? 'rgba(255,255,255,.14)' : 'rgba(255,54,0,.1)'};display:flex;align-items:center;justify-content:center">${icon(k.ikon, 180, koyuMu(z) ? '#fff' : ORANGE, 1.7)}</div>` : ''}
        ${ctx.kaydirmali ? `<div class="abs pill" style="left:80px;bottom:76px;padding:20px 32px;font-size:30px;background:${koyuMu(z) ? '#fff' : ORANGE};color:${koyuMu(z) ? ORANGE : '#fff'}">Kaydır →</div>` : logo(z, 'left:80px;bottom:72px;width:190px')}`);
    }
    case 'ipucu':
      return page(W, H, BG.acik, `${road(W, H, ORANGE, 0.55)}${sayac('acik')}
        <div class="abs col" data-sigdir style="left:80px;right:80px;top:150px;bottom:170px;justify-content:center;gap:44px">
          <div style="display:flex;align-items:center;gap:34px">
            <div style="width:200px;height:200px;border-radius:60px;background:${ORANGE};display:flex;align-items:center;justify-content:center;box-shadow:0 20px 44px rgba(255,54,0,.3)">${icon(k.ikon, 124, '#fff', 1.8)}</div>
            ${k.no ? `<div style="font-weight:900;font-size:150px;letter-spacing:-0.04em;color:rgba(255,54,0,.18)">${kac(k.no)}</div>` : ''}
          </div>
          <h1 style="font-size:${k.baslik.length > 30 ? 86 : 100}px;color:${INK}">${kac(k.baslik)}</h1>
          <p style="font-size:${k.not ? 42 : 46}px;color:#3f3f46">${kac(k.metin)}</p>
          ${k.not ? `<p style="font-size:34px;color:${ORANGE};font-weight:700">${kac(k.not)}</p>` : ''}
        </div>
        ${logo('acik', 'left:80px;bottom:72px;width:170px')}`);
    case 'kapanis': {
      const z = k.zemin ?? 'turuncu';
      const genis = k.ekran ? 560 : 920;
      return page(W, H, BG[z], `${road(W, H, z === 'koyu' ? ORANGE : '#fff', z === 'koyu' ? 0.8 : 1)}${sayac(z)}
        <div class="abs col" data-sigdir style="left:80px;top:170px;width:${genis}px;bottom:170px;gap:36px">
          <h1 style="font-size:${k.ekran ? (k.baslik.length > 26 ? 88 : 100) : 124}px">${kac(k.baslik)}</h1>
          ${k.metin ? `<p style="font-size:${k.ekran ? 38 : 46}px;opacity:.92">${kac(k.metin)}</p>` : ''}
          ${k.rozet === false ? '' : rozet(ORANGE, '#fff', k.ekran ? 26 : 32)}
        </div>
        ${k.ekran ? telefon(k.ekran, { right: -50, top: 300, width: 430, rotate: 5 }) : ''}
        ${!k.ekran && k.ikon ? `<div class="abs" style="right:80px;bottom:120px;width:260px;height:260px;border-radius:80px;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center">${icon(k.ikon, 150, '#fff', 1.8)}</div>` : ''}
        ${logo(z, 'left:80px;bottom:72px;width:200px')}`);
    }
    case 'izgara': {
      const z = k.zemin ?? 'acik';
      const sutun = k.ogeler.length <= 6 ? 2 : 3;
      return page(W, H, BG[z], `${road(W, H, z === 'acik' ? ORANGE : '#fff', z === 'acik' ? 0.5 : 1)}${sayac(z)}
        <div class="abs col" data-sigdir style="left:80px;right:80px;top:100px;bottom:90px;gap:44px">
          <h1 style="font-size:${sutun === 2 ? 104 : 84}px;margin-right:100px;color:${koyuMu(z) ? '#fff' : INK}">${kac(k.baslik)}</h1>
          <div style="display:grid;grid-template-columns:repeat(${sutun},1fr);gap:${sutun === 2 ? 28 : 22}px">
            ${k.ogeler.map((o) => `<div class="card" style="border-radius:40px;padding:${sutun === 2 ? '40px 34px' : '28px 18px 26px'};display:flex;flex-direction:column;align-items:${sutun === 2 ? 'flex-start' : 'center'};gap:18px;box-shadow:0 12px 30px rgba(194,44,0,.12)">
              <span style="width:${sutun === 2 ? 96 : 92}px;height:${sutun === 2 ? 96 : 92}px;border-radius:30px;background:#fff1ea;display:flex;align-items:center;justify-content:center">${icon(o.ikon, 56, ORANGE, 2)}</span>
              <span style="font-weight:800;font-size:${sutun === 2 ? 40 : 31}px;line-height:1.1;text-align:${sutun === 2 ? 'left' : 'center'}">${kac(o.etiket)}</span></div>`).join('')}
          </div>
        </div>`);
    }
    case 'liste': {
      const bas = k.numara_baslangic ?? null;
      return page(W, H, BG.acik, `${road(W, H, ORANGE, 0.5)}${sayac('acik')}
        <div class="abs col" data-sigdir style="left:80px;right:80px;top:170px;bottom:100px;justify-content:center;gap:${k.ogeler.length > 3 ? 30 : 40}px">
          ${k.ogeler.map((o, j) => `<div class="card" style="border-radius:40px;padding:34px 36px;display:flex;gap:28px;align-items:flex-start;box-shadow:0 12px 30px rgba(194,44,0,.12)">
            <span style="flex:none;width:96px;height:96px;border-radius:30px;background:${ORANGE};display:flex;align-items:center;justify-content:center">${icon(o.ikon, 56, '#fff', 2)}</span>
            <div class="col" style="gap:10px"><div style="font-weight:900;font-size:44px;letter-spacing:-0.02em">${bas !== null ? `<span style="color:${ORANGE}">${bas + j}.</span> ` : ''}${kac(o.baslik)}</div>
            <div style="font-weight:500;font-size:31px;line-height:1.3;color:#52525b">${kac(o.metin)}</div></div></div>`).join('')}
        </div>`);
    }
    case 'alinti': {
      const z = k.zemin ?? 'acik';
      const yazi = koyuMu(z) ? '#fff' : INK;
      return page(W, H, BG[z], `${road(W, H, z === 'turuncu' ? '#fff' : ORANGE, 0.9)}${sayac(z)}
        <div class="abs" data-sigdir style="left:80px;right:${ctx.n > 1 ? 200 : 80}px;top:100px;height:300px"><h1 style="font-size:120px;color:${yazi}">${kac(k.baslik)}</h1></div>
        ${telefon(k.ekran, { right: -40, top: 400, width: 440, rotate: -4 })}
        <div class="abs card" data-sigdir style="left:60px;top:470px;width:570px;max-height:420px;border-radius:44px;padding:40px 42px;box-shadow:0 30px 70px rgba(60,10,0,.25);transform:rotate(-3deg)">
          <div style="display:flex;align-items:center;gap:16px;color:${ORANGE};font-weight:800;font-size:26px;letter-spacing:.06em">${icon('helmet', 50, ORANGE, 2.2)} ${kac(k.kart_etiketi ?? 'KASKTA DUYDUĞUN')}</div>
          <div style="margin-top:18px;font-weight:800;font-size:${k.alinti.length > 45 ? 46 : 54}px;line-height:1.1;letter-spacing:-0.02em">“${kac(k.alinti)}”</div>
        </div>
        ${k.metin ? `<div class="abs" data-sigdir style="left:80px;width:540px;top:950px;height:230px"><p style="font-size:34px;font-weight:600;color:${yazi}">${kac(k.metin)}</p></div>` : ''}
        ${logo(z, 'left:80px;bottom:72px;width:190px')}`);
    }
    case 'soru':
      return page(W, H, BG.koyu, `${road(W, H, ORANGE, 1)}
        <img class="abs" src="${ctx.logo('beyaz')}" style="left:80px;top:90px;width:220px">
        <div class="abs col" data-sigdir style="left:80px;right:80px;top:280px;bottom:220px;gap:40px">
          <h1 style="font-size:124px">${kac(k.baslik)}</h1>
          ${k.metin ? `<p style="font-size:40px;opacity:.9;margin-right:120px">${kac(k.metin)}</p>` : ''}
        </div>
        <div class="abs pill" style="left:80px;bottom:110px;padding:24px 36px;background:${ORANGE};font-size:34px">${kac(k.rozet ?? 'Yorumlara yaz ↓')}</div>`);
    case 'ozel-gun': {
      const renk = k.renk ?? 'kirmizi';
      return page(W, H, BG[renk], `
        <div class="abs col" data-sigdir style="left:60px;right:60px;top:300px;bottom:220px;align-items:center;text-align:center;gap:34px">
          <h1 style="font-size:230px;letter-spacing:-0.04em;line-height:.95">${kac(k.buyuk)}</h1>
          <div style="font-weight:800;font-size:64px;line-height:1.15;letter-spacing:-0.02em;max-width:880px">${kac(k.baslik)}</div>
          ${k.alt ? `<div style="margin-top:30px;font-weight:700;font-size:34px;letter-spacing:.3em;opacity:.85">${kac(k.alt)}</div>` : ''}
        </div>
        <img class="abs" src="${ctx.logo('beyaz')}" style="left:50%;transform:translateX(-50%);bottom:80px;width:190px">`);
    }
    case 'hikaye': {
      const z = k.zemin ?? 'turuncu';
      return page(1080, 1920, BG[z], `${road(1080, 1920, z === 'koyu' ? ORANGE : '#fff', z === 'koyu' ? 0.8 : 1)}
        <div class="abs col" data-sigdir style="left:80px;right:80px;top:250px;height:${k.maddeler ? 1240 : 780}px;gap:40px">
          ${k.etiket ? `<div><span class="tag" style="background:rgba(255,255,255,.18)">${kac(k.etiket)}</span></div>` : ''}
          <h1 style="font-size:${k.baslik.length > 26 ? 96 : 112}px">${kac(k.baslik)}</h1>
          ${k.metin ? `<p style="font-size:46px;opacity:.92">${kac(k.metin)}</p>` : ''}
          ${k.maddeler ? `<div class="col" style="gap:20px;margin-top:10px">${k.maddeler.map((t) => `<div class="card" style="border-radius:32px;padding:26px 30px;display:flex;align-items:center;gap:20px;font-weight:800;font-size:40px">
            <span style="flex:none;width:56px;height:56px;border-radius:18px;background:#fff1ea;display:flex;align-items:center;justify-content:center">${icon('check', 34, ORANGE, 2.8)}</span>${kac(t)}</div>`).join('')}</div>` : ''}
        </div>
        ${!k.maddeler && k.ikon ? `<div class="abs" style="left:50%;top:1080px;transform:translateX(-50%);width:400px;height:400px;border-radius:120px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center">${icon(k.ikon, 230, '#fff', 1.7)}</div>` : ''}
        <img class="abs" src="${ctx.logo('beyaz')}" style="left:50%;transform:translateX(-50%);bottom:270px;width:220px">`);
    }
    default:
      throw new Error(`bilinmeyen şablon: ${k.sablon}`);
  }
}

/** Şablonun çıktı boyutu. */
export const boyut = (sablon) => (sablon === 'hikaye' ? [1080, 1920] : [1080, 1350]);
