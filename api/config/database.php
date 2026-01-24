<?php
/**
 * Database Configuration
 * Multi-tenant database support
 * Loads configuration from .env file
 */

// Central Auth Database
define('AUTH_DB_HOST', Env::get('AUTH_DB_HOST', 'localhost'));
define('AUTH_DB_PORT', Env::getInt('AUTH_DB_PORT', 3306));
define('AUTH_DB_NAME', Env::get('AUTH_DB_NAME', 'golaks_auth'));
define('AUTH_DB_USER', Env::get('AUTH_DB_USER', 'root'));
define('AUTH_DB_PASS', Env::get('AUTH_DB_PASS', ''));
define('AUTH_DB_CHARSET', Env::get('AUTH_DB_CHARSET', 'utf8mb4'));

// Tenant Database Configuration
// Her tenant için ayrı veritabanı
define('TENANT_DB_CONFIG', [
    'app' => [
        'host' => Env::get('TENANT_APP_DB_HOST', 'localhost'),
        'port' => Env::getInt('TENANT_APP_DB_PORT', 3306),
        'database' => Env::get('TENANT_APP_DB_NAME', 'golaks_app'),
        'username' => Env::get('TENANT_APP_DB_USER', 'root'),
        'password' => Env::get('TENANT_APP_DB_PASS', ''),
        'charset' => 'utf8mb4'
    ],
    'test' => [
        'host' => Env::get('TENANT_TEST_DB_HOST', 'localhost'),
        'port' => Env::getInt('TENANT_TEST_DB_PORT', 3306),
        'database' => Env::get('TENANT_TEST_DB_NAME', 'golaks_test'),
        'username' => Env::get('TENANT_TEST_DB_USER', 'root'),
        'password' => Env::get('TENANT_TEST_DB_PASS', ''),
        'charset' => 'utf8mb4'
    ],
    'demo' => [
        'host' => Env::get('TENANT_DEMO_DB_HOST', 'localhost'),
        'port' => Env::getInt('TENANT_DEMO_DB_PORT', 3306),
        'database' => Env::get('TENANT_DEMO_DB_NAME', 'golaks_demo'),
        'username' => Env::get('TENANT_DEMO_DB_USER', 'root'),
        'password' => Env::get('TENANT_DEMO_DB_PASS', ''),
        'charset' => 'utf8mb4'
    ]
]);

// Database Connection Class
class Database {
    private static $authConnection = null;
    private static $tenantConnections = [];

    /**
     * Get Central Auth Database Connection
     */
    public static function getAuthConnection() {
        if (self::$authConnection === null) {
            try {
                $dsn = "mysql:host=" . AUTH_DB_HOST . ";dbname=" . AUTH_DB_NAME . ";charset=" . AUTH_DB_CHARSET;
                self::$authConnection = new PDO($dsn, AUTH_DB_USER, AUTH_DB_PASS);
                self::$authConnection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$authConnection->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            } catch (PDOException $e) {
                throw new Exception("Auth Database Connection Error: " . $e->getMessage());
            }
        }
        return self::$authConnection;
    }

    /**
     * Get Tenant Database Connection
     * @param string $tenantId Tenant identifier (app, test, demo, etc.)
     */
    public static function getTenantConnection($tenantId) {
        if (!isset(TENANT_DB_CONFIG[$tenantId])) {
            throw new Exception("Invalid tenant: " . $tenantId);
        }

        if (!isset(self::$tenantConnections[$tenantId])) {
            try {
                $config = TENANT_DB_CONFIG[$tenantId];
                $dsn = "mysql:host={$config['host']};dbname={$config['database']};charset={$config['charset']}";
                $connection = new PDO($dsn, $config['username'], $config['password']);
                $connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $connection->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                self::$tenantConnections[$tenantId] = $connection;
            } catch (PDOException $e) {
                throw new Exception("Tenant Database Connection Error: " . $e->getMessage());
            }
        }

        return self::$tenantConnections[$tenantId];
    }

    /**
     * Close all connections
     */
    public static function closeAll() {
        self::$authConnection = null;
        self::$tenantConnections = [];
    }
}
