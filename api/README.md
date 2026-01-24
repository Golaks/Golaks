# Golaks API - PHP Backend

Modern PHP REST API with multi-tenant database support.

## 📁 Klasör Yapısı

```
api/
├── index.php              # Entry point
├── .htaccess              # Apache rewrite rules
├── config/
│   ├── config.php         # App configuration
│   └── database.php       # Database connections
├── controllers/
│   ├── BaseController.php # Base controller
│   ├── AuthController.php # Authentication (TODO)
│   ├── HealthController.php # Health check
│   └── ...
├── models/                # Database models (TODO)
├── middleware/            # Middlewares (TODO)
├── utils/
│   └── JWT.php            # JWT utility
└── routes/
    └── api.php            # Route definitions
```

## 🚀 Kurulum

### 1. Gereksinimler
- PHP >= 8.0
- MySQL >= 5.7
- Apache/Nginx web server
- PDO extension
- JSON extension
- mod_rewrite (Apache için)

### 2. Veritabanı Kurulumu

#### Central Auth Database
```sql
CREATE DATABASE golaks_auth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### Tenant Databases
```sql
CREATE DATABASE golaks_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE golaks_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE golaks_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Yapılandırma

#### Database Config
`config/database.php` dosyasını düzenleyin:
```php
define('AUTH_DB_HOST', 'localhost');
define('AUTH_DB_NAME', 'golaks_auth');
define('AUTH_DB_USER', 'your_user');
define('AUTH_DB_PASS', 'your_password');
```

#### App Config
`config/config.php` dosyasını düzenleyin:
```php
define('JWT_SECRET_KEY', 'your-secret-key-here');
define('APP_ENV', 'production'); // development or production
```

### 4. Web Server

#### Apache
`.htaccess` dosyası zaten mevcut. `mod_rewrite` aktif olmalı.

#### Nginx
```nginx
location /api {
    try_files $uri $uri/ /api/index.php?$query_string;
}
```

## 📡 API Endpoints

### Authentication
```
POST /api/auth/login           # Login
POST /api/auth/logout          # Logout
POST /api/auth/refresh         # Refresh token
POST /api/auth/forgot-password # Forgot password
POST /api/auth/reset-password  # Reset password
```

### Tenant
```
GET  /api/tenant/info          # Get tenant info
GET  /api/tenant/list          # List user's tenants
POST /api/tenant/switch        # Switch tenant
```

### User
```
GET  /api/user/profile         # Get user profile
PUT  /api/user/profile         # Update user profile
```

### Data (Tenant-specific)
```
GET /api/data/dashboard        # Dashboard data
GET /api/data/products         # Products
GET /api/data/customers        # Customers
```

### Health Check
```
GET /api/health                # API health status
```

## 🔐 Authentication Flow

### Login Request
```json
POST /api/auth/login
Content-Type: application/json

{
  "companyId": "app",
  "username": "user123",
  "password": "password123"
}
```

### Login Response
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin"
    },
    "tenant": {
      "subdomain": "app",
      "databaseName": "golaks_app",
      "displayName": "Golaks Ana Sistem"
    }
  }
}
```

### Authenticated Request
```http
GET /api/data/products
Authorization: Bearer eyJhbGc...
X-Tenant-ID: app
Content-Type: application/json
```

## 🧪 Test

### Health Check
```bash
curl http://localhost/api/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "app": "Golaks API",
    "version": "1.0.0",
    "environment": "development",
    "timestamp": "2026-01-24 03:30:00",
    "timezone": "Europe/Istanbul"
  }
}
```

## 🛡️ Security

### JWT Token
- Tokens expire after 1 hour (configurable)
- Refresh tokens valid for 7 days
- HS256 algorithm
- Secret key stored in config

### Database Security
- PDO prepared statements (SQL injection prevention)
- Password hashing (bcrypt recommended)
- Tenant isolation at database level

### Headers
- CORS configured
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block

## 📝 Sonraki Adımlar

1. ✅ Temel yapı oluşturuldu
2. ⏳ AuthController implementasyonu
3. ⏳ Database schema oluşturma
4. ⏳ User model oluşturma
5. ⏳ Middleware (authentication, tenant validation)
6. ⏳ Data controllers
7. ⏳ Error logging
8. ⏳ Unit tests

## 🔧 Development

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
// index.php başına ekle
error_reporting(E_ALL);
ini_set('display_errors', 1);
```

## 📚 Kaynaklar

- [Multi-Tenant Architecture](../MULTI_TENANT_ARCHITECTURE.md)
- PHP 8 Documentation
- JWT Best Practices
- MySQL Multi-tenancy Patterns
