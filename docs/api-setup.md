# Golaks API - Kurulum ve Deployment Rehberi

> **Not:** API mimarisi ve endpoint detayları için [API Architecture](./api-architecture.md) dokümantasyonuna bakınız.

## 📁 Klasör Yapısı

```
api/
├── index.php                  # Entry point
├── .htaccess                  # Apache rewrite rules
├── config/
│   └── config.php             # App configuration
├── includes/
│   ├── auth.php               # JWT authentication helper
│   ├── database.php           # Database PDO wrapper
│   └── response.php           # JSON response helper
├── controllers/
│   ├── AuthController.php     # Authentication
│   ├── UserController.php     # User management & profile
│   ├── CompanyController.php  # Company management
│   ├── AccountController.php  # Cari operations
│   ├── NotificationController.php
│   ├── TenantController.php
│   ├── DataController.php
│   ├── HealthController.php
│   └── apps/                  # App-specific controllers
│       ├── account/
│       ├── tannery/
│       ├── confection/
│       └── shop/
└── routes/
    ├── api.php                # Main route definitions
    └── apps/                  # App-specific routes
        ├── account.php
        ├── tannery.php
        ├── confection.php
        └── shop.php
```

## 🚀 Kurulum

### 1. Gereksinimler

- **PHP** >= 8.0
- **MySQL** >= 5.7 veya **MariaDB** >= 10.3
- **Apache/Nginx** web server
- **PHP Extensions:**
  - PDO
  - PDO_MySQL
  - JSON
  - mbstring
  - OpenSSL
- **mod_rewrite** (Apache için)

### 2. Veritabanı Kurulumu

#### Ana Sistem Veritabanı

```sql
-- Firmalar tablosu
CREATE TABLE mobil_firmalar (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    firma_adi VARCHAR(255) NOT NULL,
    yetkili_adsoyad VARCHAR(255),
    telefon VARCHAR(50),
    email VARCHAR(255),
    aktif TINYINT(1) DEFAULT 1,
    firma_ayarlar TEXT,  -- JSON: Veritabanı bağlantı bilgileri
    olusturma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Kullanıcılar tablosu
CREATE TABLE mobil_kullanici (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    mobil_firmalar_id INT UNSIGNED NOT NULL,
    ad_soyad VARCHAR(255) NOT NULL,
    kullanici_adi VARCHAR(255) NOT NULL,  -- Email
    kullanici_telefon VARCHAR(50),
    sifre VARCHAR(255) NOT NULL,  -- bcrypt hash
    kullanici_rol TINYINT(1) DEFAULT 0,  -- 0=User, 1=Admin, 2=SuperAdmin
    aktif TINYINT(1) DEFAULT 1,
    resim_yolu VARCHAR(255),
    kullanici_yetkiler TEXT,  -- JSON
    son_giris_tarihi DATETIME,
    son_aktivite_tarihi DATETIME,
    FOREIGN KEY (mobil_firmalar_id) REFERENCES mobil_firmalar(id),
    UNIQUE KEY unique_email_per_company (kullanici_adi, mobil_firmalar_id)
);

-- Bildirimler tablosu
CREATE TABLE mobil_bildirimler (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    mobil_kullanici_id INT UNSIGNED,
    baslik VARCHAR(255) NOT NULL,
    mesaj TEXT NOT NULL,
    tur VARCHAR(50),  -- info, warning, success, error
    okundu TINYINT(1) DEFAULT 0,
    olusturma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mobil_kullanici_id) REFERENCES mobil_kullanici(id)
);
```

#### firma_ayarlar JSON Örneği

```json
{
  "veritabani": {
    "server": "localhost",
    "port": "3306",
    "username": "db_user",
    "password": "db_pass",
    "databases": {
      "golaks_demo": "Ana Veritabanı",
      "golaks_test": "Test Veritabanı"
    }
  }
}
```

#### Örnek Test Kullanıcısı Oluşturma

```sql
-- Test firması
INSERT INTO mobil_firmalar (firma_adi, yetkili_adsoyad, email, firma_ayarlar) VALUES
('Test Şirketi', 'Admin User', 'admin@test.com', '{"veritabani":{"server":"localhost","port":"3306","username":"root","password":"","databases":{"golaks_demo":"Demo DB"}}}');

-- Test kullanıcısı (şifre: 123456)
INSERT INTO mobil_kullanici (mobil_firmalar_id, ad_soyad, kullanici_adi, sifre, kullanici_rol) VALUES
(1, 'Admin User', 'admin@test.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2);
```

### 3. Yapılandırma

#### .env Dosyası (Opsiyonel)

`.env.example` dosyasını kopyalayıp `.env` olarak kaydedin:

```bash
cp api/config/.env.example api/config/.env
```

`.env` içeriği:

```env
# Application
APP_ENV=development
APP_DEBUG=true
BASE_URL=http://localhost/Golaks

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=golaks_main
DB_USER=root
DB_PASS=

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-this-in-production
JWT_EXPIRY=3600
REFRESH_TOKEN_EXPIRY=604800

# CORS
CORS_ORIGIN=*
```

**ÖNEMLE:** Production'da `JWT_SECRET_KEY` değerini mutlaka değiştirin!

#### Güvenli Secret Key Oluşturma

```bash
# Linux/Mac
openssl rand -base64 32

# PHP
php -r "echo base64_encode(random_bytes(32));"
```

### 4. Web Server Konfigürasyonu

#### Apache (.htaccess)

`.htaccess` dosyası zaten mevcut. `mod_rewrite` modülünün aktif olduğundan emin olun:

```bash
# Apache mod_rewrite'ı etkinleştir
sudo a2enmod rewrite
sudo systemctl restart apache2
```

#### Nginx

`/etc/nginx/sites-available/golaks` dosyası:

```nginx
server {
    listen 80;
    server_name golaks.local;
    root /path/to/Golaks;
    index index.php index.html;

    # API routes
    location /api {
        try_files $uri $uri/ /api/index.php?$query_string;
    }

    # PHP handler
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.0-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
    }
}
```

### 5. Dosya İzinleri

```bash
# Upload klasörü için yazma izni
mkdir -p api/uploads/profiles
chmod 755 api/uploads
chmod 755 api/uploads/profiles

# Log klasörü (opsiyonel)
mkdir -p api/logs
chmod 755 api/logs
```

### 6. Test

#### Health Check

```bash
curl http://localhost/Golaks/api/health
```

Beklenen yanıt:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "app": "Golaks API",
    "version": "1.0.0",
    "timestamp": "2026-01-27 16:00:00"
  }
}
```

#### Login Test

```bash
curl -X POST http://localhost/Golaks/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "123456"
  }'
```

## 📱 Uygulama Programları

| Program ID | Klasör | API Endpoint | Türkçe Adı | Açıklama |
|-----------|--------|--------------|-----------|----------|
| muhasebe | account | /apps/account | Muhasebe | Genel muhasebe yönetimi |
| tabakhane | tannery | /apps/tannery | Tabakhane | Deri üretim süreçleri |
| konfeksiyon | confection | /apps/confection | Konfeksiyon | Giyim üretimi |
| magaza | shop | /apps/shop | Mağaza | Perakende satış |

**Not:** API endpoint'leri İngilizce, program ID'leri Türkçe. Backend sorgularında ve veritabanında Türkçe program ID'leri kullanılır.

## 🔐 Güvenlik

### Production Checklist

- [ ] `JWT_SECRET_KEY` değiştirildi
- [ ] `APP_ENV=production` ayarlandı
- [ ] `display_errors = 0` PHP'de kapalı
- [ ] CORS ayarları sıkılaştırıldı (CORS_ORIGIN=https://yourdomain.com)
- [ ] HTTPS kullanılıyor
- [ ] Veritabanı kullanıcısı minimum yetkilerle oluşturuldu
- [ ] `.env` dosyası `.gitignore`'a eklendi
- [ ] Error logging aktif
- [ ] Rate limiting eklendi (önerilir)
- [ ] Backup stratejisi hazır

### JWT Token Güvenliği

- Token süresi: 1 saat (configurable)
- Refresh token süresi: 7 gün
- Algorithm: HS256
- Secret key minimum 32 karakter

### Database Güvenliği

- ✅ PDO prepared statements (SQL injection koruması)
- ✅ Password hashing (bcrypt)
- ✅ Multi-tenant isolation (firma bazlı)

### HTTP Headers

Production'da aşağıdaki header'ları ekleyin:

```php
// index.php başına
header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');
header('X-XSS-Protection: 1; mode=block');
header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
```

## 🧪 Development

### Local Development Server

```bash
cd /path/to/Golaks/api
php -S localhost:8000 index.php
```

Test:
```bash
curl http://localhost:8000/health
```

### Error Reporting

Development ortamında hatalar gösterilir:
```php
// config/config.php
define('APP_ENV', 'development');
```

Production'da gizlenir:
```php
define('APP_ENV', 'production');
```

### Debugging

```php
// index.php başına ekle (sadece development)
if (APP_ENV === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
}
```

### Log Dosyaları

```bash
# PHP error log
tail -f /var/log/apache2/error.log

# Custom log (opsiyonel)
tail -f api/logs/api.log
```

## 🚢 Deployment

### 1. Dosyaları Sunucuya Yükle

```bash
# Git ile
git clone https://github.com/yourrepo/golaks.git
cd golaks/api

# FTP/SFTP ile
# api/ klasörünü sunucuya yükleyin
```

### 2. Composer Dependency (Eğer kullanılıyorsa)

```bash
composer install --no-dev --optimize-autoloader
```

### 3. .env Dosyasını Oluştur

```bash
cp config/.env.example config/.env
nano config/.env
# Production değerlerini girin
```

### 4. İzinleri Ayarla

```bash
chmod 755 api/uploads
chmod 755 api/logs
chown -R www-data:www-data api/uploads
chown -R www-data:www-data api/logs
```

### 5. Cache ve Optimize (Opsiyonel)

```bash
# PHP OPcache aktif mi kontrol et
php -i | grep opcache

# Nginx cache
sudo systemctl reload nginx
```

## 🔧 Sorun Giderme

### "Route not found" Hatası

**Çözüm:**
- Apache'de `mod_rewrite` aktif mi kontrol edin
- `.htaccess` dosyası var mı kontrol edin
- Nginx'de `try_files` yapılandırması doğru mu kontrol edin

### "Database connection failed"

**Çözüm:**
- `config/config.php` dosyasındaki DB bilgilerini kontrol edin
- MySQL/MariaDB servisinin çalıştığından emin olun
- Kullanıcı izinlerini kontrol edin

### "Invalid token" Hatası

**Çözüm:**
- Token'ın süresi dolmuş olabilir, refresh token ile yenileyin
- `JWT_SECRET_KEY` production ve development'ta farklı olmamalı
- Authorization header formatı: `Bearer <token>`

### CORS Hatası

**Çözüm:**
- `config/config.php` dosyasında `CORS_ORIGIN` ayarını kontrol edin
- Preflight (OPTIONS) requestleri için CORS header'larını ekleyin

## 📊 Performans Optimizasyonu

### PHP OPcache

`php.ini` dosyasına ekleyin:

```ini
opcache.enable=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=8
opcache.max_accelerated_files=10000
opcache.revalidate_freq=60
```

### Database Indexing

```sql
-- Sık kullanılan kolonlara index ekleyin
CREATE INDEX idx_kullanici_email ON mobil_kullanici(kullanici_adi);
CREATE INDEX idx_kullanici_firma ON mobil_kullanici(mobil_firmalar_id);
CREATE INDEX idx_bildirim_kullanici ON mobil_bildirimler(mobil_kullanici_id);
CREATE INDEX idx_bildirim_okundu ON mobil_bildirimler(okundu);
```

### Caching (Redis/Memcached)

```php
// TODO: Implement caching layer
// Örnek: JWT token cache, session cache
```

## 📚 Kaynaklar

- [API Architecture](./api-architecture.md) - API mimarisi ve endpoint detayları
- [PHP 8 Documentation](https://www.php.net/manual/en/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [MySQL Multi-tenancy Patterns](https://www.mysql.com/)
- [PDO Tutorial](https://www.php.net/manual/en/book.pdo.php)

## 📝 Changelog

### v1.1.0 (2026-01-27)
- ✅ Tamamen modern controller/router mimarisine geçiş
- ✅ Legacy endpoint sistemi kaldırıldı
- ✅ UserController profil yönetimi eklendi
- ✅ CompanyController eklendi
- ✅ AccountController multi-database desteği

### v1.0.0 (2026-01-24)
- ✅ İlk versiyon
- ✅ Temel API yapısı
- ✅ JWT authentication
- ✅ Multi-tenant architecture
