# RevvRide Instagram otomasyonu: gizlilik bildirimi

Yürürlük tarihi: 9 Ekim 2026

Bu bildirim, **@revvrideapp** Instagram hesabını yöneten "RevvRide Yayinci" adlı Meta uygulaması ve bu
depodaki otomasyon için geçerlidir. RevvRide mobil uygulamasının gizlilik politikası ayrı bir belgedir ve
uygulama mağazalarda yayımlandığında duyurulacaktır.

## Otomasyon ne yapar

Yalnızca @revvrideapp hesabı adına:

- gönderi ve hikâye paylaşır;
- gönderilerimize yazılan yorumlara cevap verir;
- hesabımıza gönderilen mesajlara otomatik cevap verir;
- hesabın ve gönderilerin istatistiklerini okur.

Başka hiçbir Instagram hesabının verisine erişmez, reklam ya da profil çıkarma amacıyla veri kullanmaz.

## Hangi veriler, nasıl işlenir

**Yorumlar.** Gönderilerimize yazılan herkese açık yorumların metni ve yorum kimliği, cevap hazırlamak için
işlenir. Cevaplar yapay zekâ (Anthropic'in Claude modeli) yardımıyla hazırlanır; bu amaçla yorum metni
Anthropic'e iletilir. Yorum yazan kişinin kullanıcı adı ve profil bilgileri kaydedilmez. Yorum metni, yoruma
cevap verildikten ya da cevap verilmemesine karar verildikten sonra kayıttan silinir; yorum kimliği en fazla
30 gün tutulur.

**Mesajlar.** Hesabımıza gönderilen mesajların metni yalnızca otomatik cevabın konusunu belirlemek için o
anda işlenir. Mesaj metni ve gönderen bilgisi **kaydedilmez, saklanmaz ve yapay zekâ dahil hiçbir üçüncü
kişiye iletilmez.** Aynı mesaja iki kez cevap verilmemesi için mesaj ve konuşma kimliklerinin geri
döndürülemez özeti (SHA-256) 7 gün tutulur.

**İstatistikler.** Takipçi sayısı ile gönderilerimizin beğeni, yorum, erişim, kaydetme ve paylaşım sayıları
tutulur. Bunlar kişisel veri içermez.

## Nerede tutulur

Otomasyonun çalışma kayıtları GitHub'da, herkese açık
[OptimalYazilim/revvride-sosyal](https://github.com/OptimalYazilim/revvride-sosyal) deposunun `durum/`
klasöründe tutulur ve yalnızca yukarıda anlatılan bilgileri içerir. Instagram erişim anahtarı GitHub'ın
şifreli gizli anahtar deposunda durur.

## Verilerinin silinmesi

Yorumunu Instagram'dan silersen otomasyon onu bir daha işlemez. Yorumuna ya da mesajına ait kaydın
(varsa) silinmesini istersen Instagram'da **@revvrideapp** hesabına "verilerimi sil" diye yaz; ilgili kayıtları
en geç 30 gün içinde sileriz. Mesaj metinleri zaten saklanmadığı için silinecek bir mesaj içeriği bulunmaz.

## İletişim

Instagram: [@revvrideapp](https://www.instagram.com/revvrideapp/)
