Golaks Versiyon Notları


[GELİŞTİRME] Android v3.4.4 (Build 24) / iOS v3.4.4 (Build 24)
==================================================================

Yeni Özellikler

İyileştirmeler


[YAYINLANDI] Android v3.4.3 (Build 23) / iOS v3.4.3 (Build 23)
==================================================================

Yeni Özellikler
- Sayfa Yardımları: Birçok ekranın sağ üstünde yeni bir yardım simgesi belirir; tıklayınca o sayfaya özel kullanım kılavuzu, adım adım rehber ve sık sorulan sorular açılır
- Yardım panelinin altındaki "AI'a sor" butonu ile bulunduğunuz sayfa hakkında doğrudan GolaksIQ'ya soru sorabilirsiniz; AI o sayfanın bağlamını otomatik olarak bilir
- Sık sorulan sorular akordeon olarak açılıp kapanır, sade görünüm
- İlk sürümde yardım eklenen ekranlar: Kasa İşlemleri, Profil, Kullanıcı Yönetimi, Şube Ayarları, Fiyat Hesaplama, Cari Hesaplar, Fiş İşlemleri, Banka Komisyon

İyileştirmeler
- AI Chat artık sayfa bağlamını ayrı bir alanla aldığı için uzun yardım metinleri "mesaj çok uzun" hatası vermiyor
- Çeşitli arayüz iyileştirmeleri


[YAYINLANDI] Android v3.4.2 (Build 22) / iOS v3.4.2 (Build 22)
==================================================================

Yeni Özellikler
- Mağaza Stokları'na "Varyanta Göre" görünüm eklendi; stoklarınızı stok kodu sırasında, tip / alt tip / cins / renk / kalite bilgileriyle birlikte tek kartta görebilirsiniz
- Mağaza stoklarında stok kodu, adı, barkod, tip, alt tip, cins, renk veya kalite ile arama yapılabiliyor
- Mağaza stoklarında "Sadece stoğu olanlar" filtresi eklendi
- Birden fazla şubesi olan ürünlerde kart açılarak şubelere göre kalan miktarlar görüntüleniyor
- Cari ekstresinde tüm hareketler görüntülenebiliyor: aşağı kaydırınca otomatik olarak sonraki sayfa yükleniyor, sayfalar arası bakiye tutarlı
- AI Chat'te her mesajın altında gönderim saati gösteriliyor; ayrıca yanıtı veren sunucu da küçük olarak yazıyor
- Güncelleme kontrolü artık mağazadaki en son sürümü gerçek zamanlı kontrol ediyor; yeni sürüm yayınlandığında size haber veriyor

İyileştirmeler
- Cari ekstrelerinde önceki 100 kayıt sınırı kaldırıldı, tüm hareketler erişilebilir
- Stok ekranlarında performans iyileştirmeleri
- AI sohbet altyapısı yenilendi


[YAYINLANDI] Android v3.4.1 (Build 21) / iOS v3.4.1 (Build 21)
==================================================================

Yeni Özellikler
- Kasa işlemlerinde cari hesap araması yenilendi; yazdıkça anında filtreleme yapılıyor, kayıt sayısı sınırı kaldırıldı
- Kasa hareket eklerken cari seçince açıklama otomatik olarak cari adıyla dolduruluyor; cari değişince yeniden güncelleniyor

İyileştirmeler
- iOS ve Android sürüm numaraları eşitlendi
- Liste ve seçim alanlarında küçük tasarım ve davranış düzeltmeleri


[YAYINLANDI] Android v3.4.0 (Build 15) / iOS v1.1.6 (Build 19)
==================================================================

Yeni Özellikler
- Şube Ayarları: "Pasan Müşteri Hesabı" alanı eklendi (sadece mağaza modülü aktif firmalarda görünüyor, prefix 120)
- Satış formu (mağaza): Şubenin varsayılan pasan müşteri hesabı yeni satışta otomatik geliyor
- Satış formu: Rezervasyon alanı müşteri üstüne taşındı ve sadece "Beklenen" (durum=0) rezervasyonlar listeleniyor
- Satış formu: Rezervasyon listesi saat · acente · pax formatında, saat HH:MM olarak gösteriliyor
- Satış formu: Rezervasyon seçilince acente ve rehber otomatik dolduruluyor (düzenleme modunda da)
- Satış detay formu: Tek input ile hem stok adı/kodu araması hem barkod kamera okutma yapılabiliyor
- Satış detay formu: Stok arama sonuçları inline dropdown olarak gösteriliyor, tıklanınca satır ekleniyor
- Satış detay formu: Miktar alanına +/- butonları eklendi (minimum 1, manuel sıfır girişinde otomatik 1'e döner)
- Satış detay formu: Son kalan ürün de silinebiliyor, satır açıklama alanı kaldırıldı
- Rezervasyon formu: Beklenen Saat, Yetişkin Pax, Milliyet zorunlu (kırmızı border + shake validation)

İyileştirmeler
- Rezervasyon formu: Tüm input ikonları (saat, pax, milliyet, şube, acente, rehber, not) temizlendi
- Rezervasyon formu: Tarih alanı takvim ikonu rengi nötrleştirildi, label'dan zorunlu yıldızı kaldırıldı
- Rezervasyon listesi: Durum filter chip'leri kompakt pill tasarımına çevrildi
- TanimSelectInput'a hideIcon prop'u eklendi (şu an milliyet alanında kullanılıyor)
- Şube Ayarları: Kaydet butonu alt boşluğu artırıldı
- SalesController getNextSeriNo: Şube varsayılan döviz yanı sıra pasanMusteriId de dönüyor
- Satış detay formu: İndirim satırı ile satır tutarı arasındaki boşluk azaltıldı
- BarcodeScanner nested modal sorununu aşmak için SatisDetayForm'da root seviyede render ediliyor


[YAYINLANDI] Android v3.3.9 (Build 14) / iOS v1.1.5 (Build 18)
==================================================================

Yeni Özellikler
- Tabakhane modülü: Raporlar > Stoklar menüsü eklendi (7 kategori: Hamderi, Alt Kat, Crust, Boyalı, Finisaj, Kimyasal, Yedek Malzeme)
- Tabakhane modülü: İşlemler > Siparişler menüsü eklendi (sipariş listeleme, oluşturma, düzenleme)
- Tabakhane sipariş master formu: Deri Tipi (Kürk/Zig/Vidala), sipariş kodu, cari, tarihler, avans, indirim, tüm alanlar
- Tabakhane sipariş detay formu: Accordion bölümlerle stok seçimi, özellikler, tüy & süed, fiyat & miktar
- Sipariş detay formunda barkod tarama ile stok seçimi (crust, boyalı, finisaj stokları)
- Sipariş avans ve indirim muhasebe fişi otomatik oluşturma (FisService)
- FisService: Parametrik döviz çevrimi ile çift ayaklı fiş oluşturma (borc/alacak, dövizli, cari - 3 farklı kur)
- İşlem Log sistemi: Düzenleme ve silme işlemlerinin kayıt altına alınması (LogService)
- İşlem Log: Eski/yeni tüm değerler, değişen alanlar (fark) ve geri dönüş SQL'i JSON'da tutulur
- Profil > Sistem Ayarları > Şube Ayarları sayfası eklendi
- Şube Ayarları: Hesap Kodları (Sipariş Avansları 340, Sipariş İndirim 611, Varsayılan Kasa 100, Varsayılan Banka 102)
- Şube Ayarları: Muhasebe Fişi Kapalı Gönder ve Reçete Normal Hesaplama switch'leri
- Şube ayarları şubeye göre yüklenir ve sube_genel_ayar JSON'a kaydedilir
- Türkçe güncelleme uyarı modalı eklendi (iOS ve Android)
- Backend versiyon kontrol endpoint'i eklendi (GET /health/version-check)

İyileştirmeler
- Tüm ekranlarda pageHeader üst boşlukları eşitlendi (paddingTop: 16)
- Tüm header'larda + ve arama buton sırası standartlaştırıldı (önce +, sonra arama)
- Stat card fontları küçültüldü (label: 10, value: 16)
- Stat card seçili durumda kendi renginde çerçeve gösteriyor (mavi/yeşil/sarı/gri/kırmızı)
- Tabakhane stok filtresi yatay scroll chip tasarımına geçirildi
- Deri tipi badge'leri farklı renklerde (Kürk: mor, Zig: sarı, Vidala: pembe)
- Sipariş listesinde kalan tutar hesaplanıyor (toplam - indirim - avans)
- Sipariş kartlarında expanded detayda: Siparişi Alan, Sipariş Grubu/Tipi, Teslim Şekli, Paketleme, İndirim/Avans Fişleri
- TanimSelectInput'a tabakhane özel tanım kodları eklendi (Menşei, Deri Cinsi, Deri Renk, Kalite, Finisaj, Tüy/Süed renk ve efektler, Birim)
- OrderCreateData interface'ine deriGrubu, siparisGrubuId, siparisTipiId, siparisiAlan eklendi
- Backend OrdersController: siparis_master'a deri_grubu, siparisi_alan, siparis_grubu_id, siparis_tipi_id SELECT/INSERT/UPDATE eklendi
- Backend AccountController: sube-ayarlar ve sube-ayarlar-save endpoint'leri eklendi
- Backend AccountController: getCariList ve getNextHesapKodu'ya custom prefix desteği eklendi
- sp-react-native-in-app-updates kaldırıldı, kendi Türkçe güncelleme sistemi eklendi
- "Güncelle" butonu App Store / Play Store'a yönlendiriyor

Hata Düzeltmeleri
- iOS'ta güncelleme uyarısı İngilizce geliyordu, Türkçe özel modal ile değiştirildi
- Profil > Sistem Ayarları > Genel Ayarlar menüsü kaldırıldı
- Fiş detay döviz alanlarına boş string yerine NULL gönderiliyor (FK constraint hatası düzeltildi)
- FisService firma_id doğru şirket DB'sindeki firmalar.id ile yazılıyor (mobil_firmalar.id değil)
- FisService fiş no üretimi düzeltildi (createFisMaster gerçek fisNo'yu dönüyor)
- OrdersController getContext: kullanici_yetkiler'den varsayilan_sube alınıyor (subeId 0 sorunu düzeltildi)
- Şube ayarları kolon adı düzeltildi (sube_genel_ayarlar → sube_genel_ayar)


[YAYINLANDI] Android v3.3.7 (Build 12) / iOS v1.1.4 (Build 17)
==================================================================

Yeni Özellikler
- Barkod sonuç ekranına ekran ayarları modalı eklendi (Header'da ayar ikonu)
- Stok dağılım tablo kolonları (Şube, Depo, Tip, Renk, Beden, Adet) kullanıcı tarafından göster/gizle yapılabilir
- Ürün görseli göster/gizle ayarı eklendi
- Filtreleme bölümü göster/gizle ayarı eklendi
- Ekran ayarları kullanıcı bazlı veritabanına kaydediliyor (kullanici_yetkiler.ekran_ayarlari)
- Türkçe güncelleme uyarı modalı eklendi (iOS ve Android)
- Backend versiyon kontrol endpoint'i eklendi (GET /health/version-check)

İyileştirmeler
- AuthContext'e updateUserYetkiler metodu eklendi (yetkiler hem lokale hem backend'e yazılıyor)
- UserController updateProfile endpoint'i yetkiler güncellemesini destekliyor
- sp-react-native-in-app-updates kaldırıldı, kendi Türkçe güncelleme sistemi eklendi
- "Güncelle" butonu App Store / Play Store'a yönlendiriyor

Hata Düzeltmeleri
- iOS'ta güncelleme uyarısı İngilizce geliyordu, Türkçe özel modal ile değiştirildi


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