<?php
/**
 * Configuration Loader
 * Loads main configuration file
 */

// Load main config
require_once __DIR__ . '/../config/config.php';

// Database Configuration (Legacy support)
if (!defined('DB_HOST')) {
    define('DB_HOST', Env::get('DB_HOST', 'localhost'));
}
if (!defined('DB_NAME')) {
    define('DB_NAME', Env::get('DB_NAME', 'golaks'));
}
if (!defined('DB_USER')) {
    define('DB_USER', Env::get('DB_USER', 'root'));
}
if (!defined('DB_PASS')) {
    define('DB_PASS', Env::get('DB_PASS', ''));
}

// CORS Origin (Legacy support)
if (!defined('CORS_ORIGIN')) {
    define('CORS_ORIGIN', Env::get('CORS_ALLOWED_ORIGINS', '*'));
}
