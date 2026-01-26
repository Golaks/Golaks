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
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/database.php';
require_once __DIR__ . '/includes/response.php';
require_once __DIR__ . '/includes/auth.php';

// CORS Headers
header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
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

// Define request method for legacy endpoints
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Get request path
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);

// Remove common base paths
$path = preg_replace('#^/Golaks(/|$)#', '', $path);
$path = preg_replace('#^/api(/|$)#', '', $path);
$path = preg_replace('#^/index\.php(/|$)#', '', $path);
$endpoint = trim($path, '/');

// Check if it's a router-based endpoint (starts with specific prefixes)
$routerPrefixes = ['auth/', 'notifications/', 'user/', 'tenant/', 'data/', 'apps/'];
$useRouter = false;
foreach ($routerPrefixes as $prefix) {
    if (strpos($endpoint, $prefix) === 0) {
        $useRouter = true;
        break;
    }
}

if ($useRouter) {
    // Use new Router system
    if (!defined('API_PREFIX')) {
        define('API_PREFIX', '/api');
    }
    if (!defined('ROUTES_PATH')) {
        define('ROUTES_PATH', __DIR__ . '/routes');
    }
    if (!defined('CONTROLLERS_PATH')) {
        define('CONTROLLERS_PATH', __DIR__ . '/controllers');
    }

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
} else {
    // Use legacy endpoint system
    if (empty($endpoint)) {
        Response::success([
            'name' => 'Golaks API',
            'version' => '1.0.0',
            'status' => 'active',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }

    $endpointFile = __DIR__ . '/endpoints/' . $endpoint . '.php';

    if (!file_exists($endpointFile)) {
        Response::error(
            'Endpoint not found',
            'ENDPOINT_NOT_FOUND',
            404,
            [
                'endpoint' => $endpoint,
                'request_uri' => $requestUri
            ]
        );
    }

    try {
        require_once $endpointFile;
    } catch (Throwable $e) {
        error_log('Endpoint error: ' . $e->getMessage());
        Response::error(
            'Sunucu hatası: ' . $e->getMessage(),
            'SERVER_ERROR',
            500
        );
    }
}
