# Golaks Mobile

Modern React Native mobil uygulama ve PHP backend API.

## 📱 Proje Yapısı Yeni

```
Golaks/
├── src/                    # React Native kaynak kodları
│   ├── components/        # Yeniden kullanılabilir komponentler
│   ├── contexts/          # React Context (Theme, vb.)
│   ├── screens/           # Uygulama ekranları
│   ├── services/          # API servisleri
│   ├── constants/         # Sabitler
│   ├── types/             # TypeScript tipleri
│   ├── utils/             # Yardımcı fonksiyonlar
│   └── assets/            # Görseller, fontlar
├── api/                   # PHP Backend API
│   ├── config/            # Veritabanı ve ayar dosyaları
│   ├── controllers/       # API controllers
│   ├── models/            # Veritabanı modelleri
│   ├── middleware/        # Middleware'ler
│   ├── utils/             # Utility class'ları
│   └── routes/            # API rotaları
├── android/               # Android native kod
├── ios/                   # iOS native kod
└── docs/                  # Dokümantasyon
```

## 🚀 Teknolojiler

### Mobile App
- **React Native** 0.83.1
- **TypeScript**
- **React** 19.2.0
- **AsyncStorage** - Veri saklama
- **Linear Gradient** - Gradient efektler
- **Vector Icons** - İkonlar

### Backend API
- **PHP** 8.x
- **MySQL** - Multi-tenant database
- **JWT** - Authentication
- **REST API** - Modern API yapısı

## 🔐 Multi-Tenant Architecture

Uygulama multi-tenant yapısını destekler:
- Her firma için ayrı veritabanı
- Firma ID bazlı giriş sistemi
- JWT token ile authentication
- Tenant-specific data isolation

### Login Flow
```
Firma ID + Kullanıcı Adı + Şifre
```

## 📦 Kurulum

### Mobile App

```bash
# Dependencies
npm install

# iOS
cd ios && bundle install && bundle exec pod install && cd ..

# Run iOS
npm run ios

# Run Android
npm run android
```

### Backend API

```bash
# PHP requirements
- PHP >= 8.0
- MySQL >= 5.7
- PDO extension
- JSON extension

# Setup
1. Veritabanlarını oluştur (auth ve tenant databases)
2. api/config/database.php dosyasını ayarla
3. Web sunucunu yapılandır (Apache/Nginx)
```

## 🎨 Özellikler

### Mobile
- ✅ Modern splash screen animasyonları
- ✅ Login ekranı (Firma ID + Kullanıcı + Şifre)
- ✅ Light/Dark tema desteği
- ✅ Animasyonlu UI komponentleri
- ✅ Reusable Input ve Button komponentleri
- ✅ TypeScript tip güvenliği

### Backend
- ✅ RESTful API yapısı
- ✅ JWT authentication
- ✅ Multi-tenant database support
- ✅ Centralized error handling
- ✅ CORS support
- ✅ Clean architecture

## 🔧 Yapılandırma

### API Endpoint
```typescript
// src/constants/ApiConfig.ts
export const BASE_API_URL = 'https://api.golaks.com';
```

### Bundle Identifier
```
iOS: com.golaks.golaksmobile
Android: com.golaks.golaksmobile
```

## 📚 Dokümantasyon

- [Multi-Tenant Architecture](MULTI_TENANT_ARCHITECTURE.md) - Detaylı mimari açıklama

## 🤝 Geliştirme

```bash
# Metro bundler
npm start

# Clear cache
npm start -- --reset-cache

# Build
npm run android -- --mode=release
npm run ios -- --configuration=Release
```

## 📄 Lisans

© 2026 Golaks. Tüm hakları saklıdır.
