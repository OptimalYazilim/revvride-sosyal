/*
 * Instagram mesajlarına (DM) otomatik cevap şablonları. Mesajın konusu anahtar kelimelerle bulunur,
 * o konunun cevabı gönderilir. Sıra önemlidir: ilk eşleşen konu kazanır (acil durum en önde).
 * Cevaplar AJANS.md'deki gerçek özelliklere dayanır; "ücretsiz", radar, kaza algılama gibi vaatler yoktur.
 * Mesaj içerikleri hiçbir yere kaydedilmez.
 */

/** Türkçe karakterleri sadeleştirir: eşleşme "çıkıyor", "cikiyor", "ÇIKIYOR" için aynı çalışsın. */
export function sadele(metin) {
  return metin
    .toLocaleLowerCase('tr')
    .replace(/[ıİ]/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u');
}

export const KONULAR = [
  {
    ad: 'acil',
    kelime: /kaza yaptim|kaza gecirdim|yaraliyim|yarali var|acil yardim|imdat|yardim edin|dustum/,
    cevap: 'Geçmiş olsun. Acil bir durumdaysan lütfen hemen 112\'yi ara. RevvRide 112\'nin yerine geçmez; önce 112.',
  },
  {
    ad: 'veri-silme',
    kelime: /verilerimi sil|veri sil|bilgilerimi sil|kvkk|gdpr|kisisel veri/,
    cevap: 'Talebini aldık. Yorumuna ya da mesajına ait kayıtları (varsa) en geç 30 gün içinde sileceğiz. Mesaj içerikleri zaten saklanmıyor. 🙏',
    insan: true,
  },
  {
    ad: 'is-birligi',
    kelime: /is birligi|isbirligi|reklam|sponsor|partner|ortaklik|influencer|tanitim yap|collab|marka/,
    cevap: 'İş birliği teklifin için teşekkürler! 🙌 Ekibimize ilettik; uygun bulursak seninle buradan iletişime geçeceğiz.',
    insan: true,
  },
  {
    ad: 'fiyat',
    kelime: /fiyat|ucret|kac tl|kac lira|para|bedava|abonelik|premium|odeme/,
    cevap: 'Fiyatlandırmayla ilgili bilgiyi yakında paylaşacağız. Takipte kal, ilk sen öğren! 🏍️',
  },
  {
    ad: 'test',
    kelime: /beta|test surumu|test etmek|denemek ist|tester|erken erisim/,
    cevap: 'Çok sevindik! 🧡 Test sürümü açıldığında ilk olarak buradan ve hikâyelerimizden duyuracağız; takipte kal.',
  },
  {
    ad: 'cikis',
    kelime: /ne zaman|cikiyor|cikacak|indir|link|app ?store|google ?play|play ?store|yayinda mi|yayina|nereden|nasil bulurum|apk/,
    cevap: 'Çok yakında App Store ve Google Play\'de olacağız! 🏍️ Çıktığı gün buradan ve hikâyelerimizden duyuracağız; takipte kal.',
  },
  {
    ad: 'nasil-kullanilir',
    kelime: /nasil kullan|nasil calis|kullanabilir|ne ise yar|nedir|ne yapiyor|nasil bir uygulama|ozellik/,
    cevap: 'RevvRide çok yakında App Store ve Google Play\'de! 🏍️ Çıkınca uygulamayı indirip telefon numaranla giriş yapman yeterli. Kask intercom\'unu telefona Bluetooth ile bağla, "Sürüşe başla"ya dokun: önündeki tehlikeleri kaskından duyarsın, sürüşün kaydedilir. Adım adım anlatım profilimizdeki "Nasıl?" öne çıkanında.',
  },
  {
    ad: 'platform',
    kelime: /android|ios|iphone|samsung|huawei|telefonum|uyumlu mu/,
    cevap: 'RevvRide iOS ve Android için geliyor. Çok yakında App Store ve Google Play\'de! 📱',
  },
  {
    ad: 'intercom',
    kelime: /intercom|interkom|kask|bluetooth|sena|cardo|freedconn|interphone|midland|kulaklik/,
    cevap: 'RevvRide, telefona Bluetooth ile bağlanan her intercom\'la çalışır. Telefonunu intercom\'una eşleştirmen yeterli; tehlike ikazları kaskından duyulur, müzik konuşma süresince kısılır. 🎧',
  },
  {
    ad: 'sos',
    kelime: /\bsos\b|acil durum|yardim agi|acil kisi/,
    cevap: 'SOS\'a basılı tutunca acil kişilerine SMS gider, yardım ağındaki yakın sürücülere de haber verilir. Unutma: RevvRide 112\'nin yerine geçmez; hayati tehlikede önce 112\'yi ara.',
  },
  {
    ad: 'kulup',
    kelime: /kulup|konvoy|etkinlik|grup surusu|bulusma/,
    cevap: 'RevvRide\'da kulübünü kurabilir, etkinlik açabilir ve etkinlik günü konvoyu başlatabilirsin; "Katılıyorum" diyenler kod girmeden katılır, geride kalan olursa herkes kaskından duyar. 🏍️',
  },
  {
    ad: 'rota',
    kelime: /rota|viraj|yol oner|nereye gid|harita|navigasyon/,
    cevap: 'RevvRide\'da sürücülerin paylaştığı virajlı rotaları viraj sayısı ve kıvrımlılığıyla bulabilir, kendi sürüşünü rotaya çevirip paylaşabilirsin. Rotayı sürerken keskin virajlar yaklaşınca kaskından haber alırsın. 🛣️',
  },
  {
    ad: 'tehlike',
    kelime: /tehlike|ikaz|cukur|micir|uyari/,
    cevap: 'Sürücülerin bildirdiği çukur, mıcır, yağ, kaza gibi tehlikeleri sen yaklaşırken kaskından duyarsın; geçerken "Hâlâ orada" ya da "Artık yok" diyerek bilgiyi güncel tutarsın. İkazlar yardımcıdır, yolu her zaman kendi gözünle oku. ⚠️',
  },
  {
    ad: 'sikayet',
    kelime: /calismiyor|hata|sorun|bozuk|sikayet|memnun degil/,
    cevap: 'Bildirdiğin için teşekkürler, ekibimize ilettik. 🙏 En kısa sürede ilgileneceğiz.',
    insan: true,
  },
  {
    ad: 'tesekkur',
    kelime: /tesekkur|sagol|harika|super|mukemmel|basarilar|eline saglik|bravo|guzel olmus/,
    cevap: 'Biz teşekkür ederiz! 🧡 Yolda görüşmek üzere.',
  },
  {
    ad: 'selam',
    kelime: /^(selam|merhaba|mrb|slm|sa|selamun aleykum|iyi gunler|hey|hi|hello)[\s!.]*$/,
    cevap: 'Merhaba! 👋 RevvRide\'a hoş geldin. Uygulama çok yakında App Store ve Google Play\'de. Merak ettiğin bir şey varsa yaz, yardımcı olalım.',
  },
];

export const VARSAYILAN = {
  ad: 'diger',
  cevap: 'Mesajın için teşekkürler! 🏍️ Ekibimiz en kısa sürede dönecek. Bu arada sık sorulan soruların cevapları profilimizdeki öne çıkanlarda.',
  insan: true,
};

/** Mesajın konusunu ve cevabını bulur. */
export function konuBul(metin) {
  const s = sadele(metin).trim();
  return KONULAR.find((k) => k.kelime.test(s)) ?? VARSAYILAN;
}
