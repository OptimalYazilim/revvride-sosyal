# RevvRide sosyal medya otomasyonu

RevvRide'ın Instagram hesabını bilgisayardan bağımsız, 7/24 yöneten sistem. Bu depo herkese açıktır
çünkü Instagram görselleri herkese açık bir adresten çeker. Burada yalnızca paylaşılacak görseller ve
metinler durur; uygulamanın kodu ve şifreler bu depoda yoktur.

## Nasıl çalışır

| Parça | Nerede çalışır | Ne yapar |
|---|---|---|
| **Yayıncı** (`.github/workflows/yayinla.yml`) | GitHub, 15 dakikada bir (her çalışma bir sonrakini başlatır) | Saati gelen gönderiyi ve hikâyeyi Instagram'ın resmî API'siyle paylaşır, erişim anahtarını yeniler, günde bir istatistik alır |
| **Çizer** (`.github/workflows/ciz.yml`) | GitHub, yeni taslak gelince | Taslakların görsellerini çizer, yazı taşarsa durdurur, takvime ekler |
| **İçerik ajansı** (Claude bulut rutini) | Anthropic, haftada bir | Önümüzdeki 2 haftanın gönderilerini [AJANS.md](AJANS.md)'deki kurallarla yazar, ayda bir rapor çıkarır |
| **Yorum cevapları** (Claude bulut rutini) | Anthropic, 2 saatte bir (08:00–24:00) | Yayıncının topladığı yeni yorumlara [YORUM.md](YORUM.md)'deki kurallarla cevap yazar; yayıncı gönderir |

Takvim: [icerik/takvim.json](icerik/takvim.json) · Paylaşılanlar: [durum/yayinlananlar.json](durum/yayinlananlar.json) ·
İstatistik: [durum/istatistik.json](durum/istatistik.json) · Aylık raporlar: [raporlar/](raporlar/)

## Instagram'ı bağlama (bir kerelik)

1. **Profesyonel hesap.** Telefonda Instagram > profil > ☰ > *Hesap türü ve araçlar* > *Profesyonel hesaba geç*
   > *İşletme*. Ücretsizdir.
2. **Meta uygulaması.** [developers.facebook.com/apps](https://developers.facebook.com/apps) adresinde Facebook
   hesabınla giriş yap (ilk kez giriyorsan geliştirici kaydını tamamla).
   - *Uygulama oluştur* > ad: `RevvRide Yayinci` > kullanım alanı: **Instagram'da mesajları ve içeriği yönet**
     (*Manage messaging & content on Instagram*) > oluştur.
   - Soldaki menüde *Instagram* > **Instagram girişiyle API kurulumu** (*API setup with Instagram login*).
   - *1. Erişim anahtarları oluştur* bölümünde **Hesap ekle** (*Add account*) > RevvRide Instagram hesabıyla
     giriş yap ve izin ver.
   - Hesabın yanındaki **Anahtar oluştur** (*Generate token*) > çıkan uzun yazıyı kopyala.
3. **GitHub'a yapıştır.** Bu deponun [Settings > Secrets and variables > Actions > New repository secret](../../settings/secrets/actions/new)
   sayfasında ad: `IG_TOKEN`, değer: kopyaladığın anahtar > *Add secret*.

4. **Zamanlayıcı.** Bu deponun [Settings > Environments](../../settings/environments) sayfasında `zamanlayici`
   ortamını aç (yoksa *New environment* > ad: `zamanlayici`) > **Wait timer** kutusunu işaretle > `14` dakika >
   *Save protection rules*.

Bu kadar. En geç 15 dakika içinde açılış gönderileri çıkar. Anahtar 60 gün geçerlidir; yayıncı her hafta
kendisi yeniler, bir daha yapıştırman gerekmez.

**Zamanlayıcı neden var:** GitHub'ın kendi zamanlayıcısı (cron) yoğun saatlerde çalışmaları saatlerce
geciktirebiliyor; bu, mesaj cevaplarının da saatlerce beklemesi demek. Bu yüzden yayıncı her çalışmanın sonunda
bir sonrakini kendisi başlatır, o da `zamanlayici` ortamında 14 dakika bekleyip paylaşıma geçer. Cron yedek
olarak durur: zincir bir yerde koparsa ilk cron çalışması onu yeniden başlatır. Bekleme süresi tanımlı değilse
zincir kendini durdurur (çalışmalar dakikada bir dönmesin diye) ve sistem yalnızca cron ile çalışır.

## Durdurma ve müdahale

- **Hepsini durdur:** *Actions* > *Yayınla* > sağ üstte ••• > *Disable workflow*. Açmak için *Enable workflow*,
  ardından bir kez *Run workflow* (zinciri yeniden başlatır).
- **Hemen çalıştır:** *Actions* > *Yayınla* > *Run workflow* (kutuyu işaretlemeden). Zincir beklerken basarsan
  çalışma hemen koşar, zincir de bozulmaz.
- **Bir gönderiyi iptal et:** `icerik/takvim.json`'dan o öğeyi sil (ya da içerik ajansına not bırak).
- **Ajansa istek:** [SAHIBIN-NOTLARI.md](SAHIBIN-NOTLARI.md) dosyasına yaz; ajans her çalışmada önce onu okur.
- **Bir şey ters giderse:** GitHub, başarısız çalışmaları hesabın e-postasına bildirir.

## Otomatik olmayanlar

- **Öne çıkanlar:** Instagram'ın API'si öne çıkan oluşturmaya izin vermiyor; ilk 6 öne çıkan instagram.com'dan
  elle oluşturuldu. Yenisi gerekirse aynı yoldan eklenir.
- **Mesaj (DM) cevapları:** açık. Yayıncı son 24 saatte gelen mesajlara konuya göre hazır cevap verir
  ([scripts/mesaj-sablonlari.mjs](scripts/mesaj-sablonlari.mjs)). Mesajlar özel olduğu için içerikleri hiçbir yere
  yazılmaz ve Claude'a gönderilmez. Sen elle cevap verdiysen sistem araya girmez. İş birliği, şikâyet ve
  tanınmayan sorular `durum/mesajlar.json`'da `insan_bekleyen` olarak sayılır; bunlara Instagram'dan bakman iyi olur.
- **Yorum cevapları:** açık; spam, hakaret ve siyasete cevap verilmez.
- **Uygulama mağazaya çıkınca:** `icerik/ayarlar.json`'daki yazı "App Store ve Google Play'de" yapılır,
  biyografiye indirme bağlantısı eklenir.
