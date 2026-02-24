# App Store Review - Rejection Notes (February 20, 2026)

**Submission ID:** c441b9b5-4262-4e50-a66a-c85fe2ca47a3
**Review Date:** February 20, 2026
**Review Device:** iPad Air 11-inch (M3)
**Version:** 1.0.0

---

## Issue 1: Guideline 2.1 - Performance - App Completeness

### EN
**Bug description:** When we tapped the "Kamerayı Aç" button, it did not respond.

**Review device details:**
- Device type: iPad Air 11-inch (M3)
- OS version: iPadOS 26.3
- Internet Connection: Active

**Next Steps:**
Test the app on supported devices to identify and resolve bugs and stability issues before submitting for review.

If the bug cannot be reproduced, try the following:
- For new apps, uninstall all previous versions of the app from a device, then install and follow the steps to reproduce.
- For app updates, install the new version as an update to the previous version, then follow the steps to reproduce.

### TR
**Hata açıklaması:** "Kamerayı Aç" butonuna dokunulduğunda yanıt vermedi.

**İnceleme cihaz bilgileri:**
- Cihaz: iPad Air 11-inch (M3)
- İşletim sistemi: iPadOS 26.3
- İnternet bağlantısı: Aktif

**Yapılması gerekenler:**
Uygulamayı desteklenen cihazlarda test ederek hataları ve kararlılık sorunlarını incelemeye göndermeden önce çözün.

Hata yeniden oluşturulamıyorsa şunları deneyin:
- Yeni uygulamalar için, cihazdan uygulamanın tüm önceki sürümlerini kaldırın, ardından yükleyip hata adımlarını tekrarlayın.
- Uygulama güncellemeleri için, yeni sürümü önceki sürüm üzerine güncelleyin, ardından hata adımlarını tekrarlayın.

---

## Issue 2: Guidelines 5.1.1(i) & 5.1.2(i) - Legal - Privacy - Data Collection and Data Use

### EN
**Issue Description:**
The app appears to share the user's personal data with a third-party AI service but the app does not clearly explain what data is sent, identify who the data is sent to, and ask the user's permission before sharing the data.

Apps may only use, transmit, or share personal data after they meet all of the following requirements:
- Disclose what data will be sent
- Specify who the data is sent to
- Obtain the user's permission before sending data
- Identify in the privacy policy what data the app collects, how it collects that data, all uses of that data, and confirm any third party the app shares data with provides the same or equal protection

**Next Steps:**
If the app sends user data to a third-party AI service, revise the app to explain what data is sent, identify who the data is sent to, and ask the user's permission before sharing personal data with a third-party AI service.

If it does not already, the app's privacy policy must also identify what data the app collects, how it collects that data, and all uses of that data, including if it is shared with a third-party AI service.

If the app does not send user data to a third-party AI service or does not include a third-party AI service, reply to this rejection to confirm and add this information to the App Review Information section of App Store Connect.

### TR
**Sorun Açıklaması:**
Uygulama, kullanıcının kişisel verilerini üçüncü taraf bir yapay zeka hizmetiyle paylaşıyor görünüyor, ancak uygulama hangi verilerin gönderildiğini açıkça belirtmiyor, verilerin kime gönderildiğini tanımlamıyor ve verileri paylaşmadan önce kullanıcının iznini almıyor.

Uygulamalar kişisel verileri ancak aşağıdaki tüm gereksinimleri karşıladıktan sonra kullanabilir, iletebilir veya paylaşabilir:
- Hangi verilerin gönderileceğini açıklamak
- Verilerin kime gönderildiğini belirtmek
- Verileri göndermeden önce kullanıcının iznini almak
- Gizlilik politikasında uygulamanın hangi verileri topladığını, bu verileri nasıl topladığını, tüm kullanım amaçlarını belirtmek ve veri paylaşılan üçüncü tarafların aynı veya eşdeğer koruma sağladığını doğrulamak

**Yapılması gerekenler:**
Uygulama kullanıcı verilerini üçüncü taraf bir yapay zeka hizmetine gönderiyorsa, uygulamayı hangi verilerin gönderildiğini açıklayacak, verilerin kime gönderildiğini belirtecek ve kişisel verileri üçüncü taraf bir yapay zeka hizmetiyle paylaşmadan önce kullanıcının iznini isteyecek şekilde güncelleyin.

Henüz yoksa, uygulamanın gizlilik politikası ayrıca uygulamanın hangi verileri topladığını, bu verileri nasıl topladığını ve üçüncü taraf yapay zeka hizmetiyle paylaşılıp paylaşılmadığı dahil tüm kullanım amaçlarını belirtmelidir.

Uygulama kullanıcı verilerini üçüncü taraf bir yapay zeka hizmetine göndermiyorsa veya üçüncü taraf yapay zeka hizmeti içermiyorsa, bu reddi yanıtlayarak durumu onaylayın ve bu bilgiyi App Store Connect'in App Review Information bölümüne ekleyin.

---

## Action Plan / Aksiyon Planı

### Bug Fix - "Kamerayı Aç" (iPad)
- [x] ~~iPad'de kamera butonunun çalışmama nedenini tespit et~~
- [x] ~~iPad'de kamera izinlerini kontrol et (Info.plist - NSCameraUsageDescription)~~
- [x] ~~iPad'e özel kamera erişim kodunu test et~~
  - BarcodeScanner sadece scannerVisible olduğunda mount ediliyor (hook crash önlemi)
  - device null ve kamera hatası için fallback UI eklendi
  - onError handler ile kamera hataları yakalanıyor
- [ ] iPad simülatör ve gerçek cihazda test et

### Privacy - AI Service Data Sharing
- [x] ~~AI Asistan özelliğinde kullanıcı verileri gönderilmeden önce izin dialog'u ekle~~
  - AIChatScreen'e consent ekranı eklendi (AsyncStorage ile kalıcı)
- [x] ~~Hangi verilerin gönderildiğini açıkça belirt (kullanıcı mesajları, firma bilgileri vb.)~~
  - "Gönderilen Veriler" kartı: mesajlar, sohbet geçmişi, dil tercihi
- [x] ~~Verilerin kime gönderildiğini belirt (OpenAI / Anthropic / kullanılan AI servisi)~~
  - "Veri Alıcısı" kartı: OpenAI açıkça belirtiliyor
- [x] ~~Gizlilik politikasını güncelle (AI veri paylaşımı bölümü ekle)~~
  - ProfileScreen'e "6. Yapay Zeka Hizmetleri" bölümü eklendi
  - Son güncelleme tarihi Şubat 2026 olarak güncellendi
- [ ] App Store Connect'te App Review Information bölümünü güncelle
