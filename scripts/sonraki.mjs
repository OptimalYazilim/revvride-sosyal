/*
 * Yayıncının bir sonraki çalışmasını başlatır. GitHub'ın zamanlayıcısı (cron) yoğun saatlerde
 * çalışmaları saatlerce geciktirebildiği için yayıncı kendini zincirleme çalıştırır: her çalışma
 * bittiğinde bir sonrakini başlatır, o da "zamanlayici" ortamının bekleme süresi dolunca paylaşıma geçer.
 * Cron yedek olarak durur: zincir koparsa ilk cron çalışması onu yeniden başlatır.
 *
 * - Bitmemiş başka bir çalışma varsa yenisini başlatmaz (sırayı o devam ettirir); zincir hiç çoğalmaz.
 * - Zincir halkası 10 dakikadan önce koştuysa ortamda bekleme süresi tanımlı değil demektir; zincir
 *   burada durur ki çalışmalar dakikada bir dönmesin.
 *
 * Ortam: GH_TOKEN, GITHUB_REPOSITORY, GITHUB_RUN_ID, ZINCIR ('true' ise bu çalışma zincirin bir halkası).
 */
const API = process.env.GITHUB_API_URL ?? 'https://api.github.com';
const REPO = process.env.GITHUB_REPOSITORY;
const IS_AKISI = 'yayinla.yml';
/** Ortamdaki bekleme süresi 14 dakikadır; bundan çok daha kısa sürdüyse bekleme süresi yok demektir. */
const EN_AZ_BEKLEME_DK = 10;

const github = async (yol, secenek = {}) => {
  const res = await fetch(`${API}/repos/${REPO}${yol}`, {
    ...secenek,
    headers: {
      authorization: `Bearer ${process.env.GH_TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
    },
  });
  if (!res.ok) throw new Error(`${secenek.method ?? 'GET'} ${yol}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
};

const bu = await github(`/actions/runs/${process.env.GITHUB_RUN_ID}`);

if (process.env.ZINCIR === 'true') {
  const gecenDk = (Date.now() - new Date(bu.created_at).getTime()) / 60e3;
  if (gecenDk < EN_AZ_BEKLEME_DK) {
    console.log(
      `::warning::Zincir durdu: bu çalışma ${gecenDk.toFixed(1)} dakikada koştu, yani "zamanlayici" ortamında ` +
        'bekleme süresi yok. Settings > Environments > zamanlayici > Wait timer: 14 dakika yapılmalı.',
    );
    process.exit(0);
  }
}

const { workflow_runs: son } = await github(`/actions/workflows/${IS_AKISI}/runs?per_page=20`);
const diger = son.find((c) => c.id !== bu.id && c.status !== 'completed');
if (diger) {
  console.log(`Bitmemiş bir çalışma var (#${diger.run_number}, ${diger.status}); sırayı o devam ettirecek.`);
  process.exit(0);
}

await github(`/actions/workflows/${IS_AKISI}/dispatches`, {
  method: 'POST',
  body: JSON.stringify({ ref: 'main', inputs: { zincir: 'true' } }),
});
console.log('Sıradaki çalışma başlatıldı; bekleme süresi dolunca paylaşıma geçecek.');
