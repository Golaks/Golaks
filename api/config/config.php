<?php
/**
 * Golaks API - Configuration
 * Loads configuration from .env file
 */

// Load environment variables
require_once dirname(__DIR__) . '/utils/Env.php';
Env::load();

// Timezone
date_default_timezone_set(Env::get('APP_TIMEZONE', 'Europe/Istanbul'));

// App Config
define('APP_NAME', Env::get('APP_NAME', 'Golaks API'));
define('APP_VERSION', Env::get('APP_VERSION', '1.0.0'));
define('APP_ENV', Env::get('APP_ENV', 'development'));
define('APP_DEBUG', Env::getBool('APP_DEBUG', false));

// Security
define('JWT_SECRET_KEY', Env::get('JWT_SECRET_KEY', 'change-this-secret-key'));
define('JWT_SECRET', JWT_SECRET_KEY); // Alias for backward compatibility
define('JWT_EXPIRY', Env::getInt('JWT_EXPIRY', 3600));
define('JWT_EXPIRATION', JWT_EXPIRY); // Alias for backward compatibility
define('REFRESH_TOKEN_EXPIRY', Env::getInt('REFRESH_TOKEN_EXPIRY', 604800));

// API Config
define('API_PREFIX', Env::get('API_PREFIX', '/api'));
define('API_RATE_LIMIT', Env::getInt('API_RATE_LIMIT', 100));
define('API_RATE_LIMIT_WINDOW', Env::getInt('API_RATE_LIMIT_WINDOW', 60));

// CORS
define('CORS_ALLOWED_ORIGINS', Env::get('CORS_ALLOWED_ORIGINS', '*'));
define('CORS_ALLOWED_METHODS', Env::get('CORS_ALLOWED_METHODS', 'GET,POST,PUT,DELETE,OPTIONS'));
define('CORS_ALLOWED_HEADERS', Env::get('CORS_ALLOWED_HEADERS', 'Content-Type,Authorization,X-Tenant-ID'));

// Allowed Tenants
define('ALLOWED_TENANTS', [
    'app' => [
        'subdomain' => 'app',
        'database_name' => Env::get('TENANT_APP_DB_NAME', 'golaks_app'),
        'display_name' => Env::get('TENANT_APP_DISPLAY_NAME', 'Golaks Ana Sistem')
    ],
    'test' => [
        'subdomain' => 'test',
        'database_name' => Env::get('TENANT_TEST_DB_NAME', 'golaks_test'),
        'display_name' => Env::get('TENANT_TEST_DISPLAY_NAME', 'Test Ortamı')
    ],
    'demo' => [
        'subdomain' => 'demo',
        'database_name' => Env::get('TENANT_DEMO_DB_NAME', 'golaks_demo'),
        'display_name' => Env::get('TENANT_DEMO_DISPLAY_NAME', 'Demo Ortamı')
    ]
]);

// Paths
define('BASE_PATH', dirname(__DIR__));
define('CONFIG_PATH', BASE_PATH . '/config');
define('CONTROLLERS_PATH', BASE_PATH . '/controllers');
define('MODELS_PATH', BASE_PATH . '/models');
define('MIDDLEWARE_PATH', BASE_PATH . '/middleware');
define('ROUTES_PATH', BASE_PATH . '/routes');
define('UTILS_PATH', BASE_PATH . '/utils');
define('LOGS_PATH', BASE_PATH . '/logs');
define('BASE_URL', Env::get('BASE_URL', 'https://api.golaks.com'));

// Error Reporting (based on environment)
if (APP_ENV === 'production') {
    error_reporting(0);
    ini_set('display_errors', 0);
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
}

// Create logs directory if not exists
if (!is_dir(LOGS_PATH)) {
    @mkdir(LOGS_PATH, 0755, true);
}
