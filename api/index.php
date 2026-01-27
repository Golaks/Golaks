<?php
/**
 * Golaks API - Entry Point
 * Modern PHP REST API
 */

// Hata raporlamayı ayarla
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Fatal error handler
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        header('Content-Type: application/json; charset=UTF-8');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => [
                'code' => 'PHP_FATAL_ERROR',
                'message' => 'PHP Hatası: ' . $error['message'],
                'file' => basename($error['file']),
                'line' => $error['line']
            ]
        ], JSON_UNESCAPED_UNICODE);
    }
});

// Load configuration and helpers
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/includes/database.php';
require_once __DIR__ . '/includes/response.php';
require_once __DIR__ . '/includes/auth.php';

// CORS Headers
header('Access-Control-Allow-Origin: ' . CORS_ALLOWED_ORIGINS);
header('Access-Control-Allow-Methods: ' . CORS_ALLOWED_METHODS);
header('Access-Control-Allow-Headers: ' . CORS_ALLOWED_HEADERS);
header('Content-Type: application/json; charset=UTF-8');

// Handle OPTIONS request for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Request body'yi al (JSON parse)
$requestBody = file_get_contents('php://input');
$_POST_DATA = json_decode($requestBody, true);

// JSON parse hatası kontrolü
if ($requestBody && $_POST_DATA === null && json_last_error() !== JSON_ERROR_NONE) {
    Response::error('JSON parse hatası: ' . json_last_error_msg(), 'JSON_PARSE_ERROR', 400);
}

$_POST_DATA = $_POST_DATA ?? [];

// Define constants for router
if (!defined('API_PREFIX')) {
    define('API_PREFIX', '/api');
}
if (!defined('ROUTES_PATH')) {
    define('ROUTES_PATH', __DIR__ . '/routes');
}
if (!defined('CONTROLLERS_PATH')) {
    define('CONTROLLERS_PATH', __DIR__ . '/controllers');
}

// Use Router system for all requests
try {
    require_once ROUTES_PATH . '/api.php';
    $router = new Router();
    $router->dispatch();
} catch (Throwable $e) {
    error_log('Router error: ' . $e->getMessage());
    Response::error(
        'Sunucu hatası: ' . $e->getMessage(),
        'SERVER_ERROR',
        500
    );
}
