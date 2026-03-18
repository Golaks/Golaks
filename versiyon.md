Golaks Versiyon Notları


[GELİŞTİRME] Android v3.3.6 (Build 11) / iOS v1.1.4 (Build 16)
==================================================================

Yeni Özellikler
-

İyileştirmeler
-

Hata Düzeltmeleri
-


[YAYINLANDI] Android v3.3.5 (Build 10) / iOS v1.1.3 (Build 15)
==================================================================

Yeni Özellikler
- Muhasebe işlemlere "Cari Hesaplar" menüsü eklendi (listeleme, ekstre, yeni cari ekleme)
- Muhasebe işlemlere "Kasa İşlemleri" menüsü eklendi (kasa oluşturma, listeleme, açık/kapalı filtre)
- Kasa giriş/çıkış hareket ekleme modalı (cari seçimi, dövizli/muhasebe/cari tutar satırları, fiş görseli yükleme)
- Kasa kartlarında accordion ile bakiye özeti ve hareket listesi (girişler/çıkışlar tab'ı)
- Sipariş formunda cari hesap ekleme özelliği (+ butonu ile hızlı cari oluşturma)
- Barkod sorgulama sonuç ekranında model bazlı stok dağılımı (tüm şube/depo/renk/beden)
- Uygulama güncelleme kontrolü altyapısı (sp-react-native-in-app-updates)

İyileştirmeler
- Tüm ekranlarda arama ve filtre bölümleri header butonuyla açılır/kapanır yapıldı
- Tüm ekranlarda "Kayıt Bulunamadı" mesajı sayfa ortasına hizalandı
- Tüm card bileşenlerinden shadow kaldırıldı ve card arası boşluklar azaltıldı
- Tüm TextInput background/border stilleri SelectInput ile tutarlı hale getirildi (colors.inputBackground)
- Rezervasyonlarda varsayılan tarih filtresi "Bugün" yerine "Bu Hafta" yapıldı
- Rezervasyon ekleme tarih seçici modal olarak açılır hale getirildi
- Rezervasyonlarda Yetişkin/Çocuk Pax ibaresi eklendi
- Sipariş kartlarında avans toplam tek satırda dövize çevrilmiş olarak gösteriliyor
- Barkod kamera zoom minimum'a düşürüldü ve dokunarak odaklama eklendi (tap to focus)
- Banka komisyon oranlarında 0 ve ondalık değer girilebilir hale getirildi
- Cari listesinde şube bilgisi yanında gösteriliyor
- Kasa & Banka ekranında kayıt yoksa başlık gizleniyor

Hata Düzeltmeleri
- Rezervasyon kaydedildiğinde mesaj ve listeleme yapılmıyordu, düzeltildi
- Rezervasyon tarih filtresi hızlı tarih butonlarıyla değişmiyordu, düzeltildi
- Sipariş döviz select ikonu para tipini gizliyordu, düzeltildi
- Sipariş avans döviz tipinde çift satır görünüyordu, düzeltildi
- Kasa oluşturmada firma_id yanlış gönderiliyordu, düzeltildi
- Cari ekleme modalında showSuccess hatası düzeltildi


[YAYINLANDI] Android v3.3.4 (Build 9) / iOS v1.1.2 (Build 11)
=================================================================

Yeni Özellikler
- Konfeksiyon raporlar sekmesine "Maliyetler" menüsü eklendi
- Kullanıcı bazlı program ve şube yetkileri yönetimi sayfası eklendi
- Fiyat hesaplama algoritması ayarları sayfası eklendi
- Banka komisyon oranları yönetim sayfası eklendi
- Model kartı oluşturma formu eklendi (BottomSheet ile açılan form)
- Model kartı düzenleme özelliği eklendi (genişletilmiş kart detayında "Düzenle" butonu)
- Model kartı formu alanları: Ana Model, Model Adı, Barkod Tipi, Model Tipi, Cinsiyet, Sezon, Tarz, Boy, Marka, Modelist, Tasarımcı, Beden Seti, Baz Beden, Set Parça Sayısı, Set İçerik, Açıklama
- Baz Beden alanı seçili beden setinin bedenlerinden SelectInput ile seçilebilir

İyileştirmeler
- Bildirim sistemi yenilendi: ekranın üstünden kayan renkli animasyonlu toast tasarımı (başarı/hata/uyarı/bilgi)
- Kullanıcı formunda boş alan kontrolü eklendi: kırmızı border + shake animasyonu (ad, e-posta, telefon, şifre)
- Geçersiz e-posta formatında hata mesajı gösterimi eklendi
- Tüm input bileşenlerinde temizle (X) butonuna basınca cursor o inputa fokuslanır
- Kullanıcı ekleme/düzenleme API hataları artık detaylı mesaj gösteriyor
- Model kartı formundaki tüm TextInput ve SelectInput alanlarına ikonlar eklendi
- Set Parça Sayısı alanı sadece rakam girişi kabul eder ve sağa yaslanır

Hata Düzeltmeleri
- Kullanıcı formu kaydetme sonrası hata veya başarı mesajı gösterilmiyordu, düzeltildi
- BottomSheet Modal açıkken bildirimler arka planda kalıyordu, düzeltildi
- PDF oluşturma hataları giderildi
- Push bildirim hataları giderildi
- Input değeri değişince kırmızı border temizlenmiyordu, düzeltildi

Kaldırılan Özellikler
- Muhasebe raporlardan "Firma Model Performans" menüsü kaldırıldı
- Muhasebe raporlardan "Personel Performans" menüsü kaldırıldı


[YAYINLANDI] Android v3.3.3 (Build 8) / iOS v1.1.1 (Build 11)
================================================================
BU SÜRÜME KADAR OLAN VERSİYONLAR YAYINLANDI..!