# Google Play Release Signing Bilgileri

> **DIKKAT:** Bu dosya hassas bilgiler icermektedir. Git'e EKLENMEMELIDIR.

## Keystore Bilgileri

| Alan | Deger |
|------|-------|
| **Keystore Dosyasi** | `android/app/golaks-upload.keystore` |
| **Orijinal Konum** | `GolaksMobile/android/app/golaks-release.keystore` |
| **Alias** | `golaks-key` |
| **Store Password** | `golaks2024` |
| **Key Password** | `golaks2024` |
| **SHA1** | `3C:C5:EA:07:10:EA:C9:F5:AD:CE:0E:90:26:DC:B9:57:3D:22:A7:C5` |

## Gradle Yapilandirmasi

Signing bilgileri `android/gradle.properties` dosyasinda:

```properties
MYAPP_UPLOAD_STORE_FILE=golaks-upload.keystore
MYAPP_UPLOAD_KEY_ALIAS=golaks-key
MYAPP_UPLOAD_STORE_PASSWORD=golaks2024
MYAPP_UPLOAD_KEY_PASSWORD=golaks2024
```

## AAB Build Komutu

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
cd android && ./gradlew bundleRelease
```

Cikti: `android/app/build/outputs/bundle/release/app-release.aab`

## Onemli Notlar

- `.gitignore` dosyasinda `*.keystore` (debug haric) git'ten haric tutulmustur
- Keystore dosyasini **KAYBETMEYIN** - Google Play ayni key ile imzalama bekler
- Orijinal keystore: `/Users/golaks/Projeler/GolaksMobile/android/app/golaks-release.keystore`
