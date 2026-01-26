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

// Handle OPTIONS request for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Request URI ve Method
$requestUri = $_SERVER['REQUEST_URI'];
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Get endpoint from query parameter or path
$endpoint = $_GET['endpoint'] ?? null;

// If no endpoint in query, try to parse from path
if (!$endpoint) {
    // Get the path from REQUEST_URI
    $path = parse_url($requestUri, PHP_URL_PATH);

    // Remove common base paths
    $path = preg_replace('#^/Golaks(/|$)#', '', $path);
    $path = preg_replace('#^/api(/|$)#', '', $path);
    $path = preg_replace('#^/index\.php(/|$)#', '', $path);

    $endpoint = trim($path, '/');
}

// Route yoksa - API bilgisi döndür
if (empty($endpoint)) {
    Response::success([
        'name' => 'Golaks API',
        'version' => '1.0.0',
        'status' => 'active',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

// Endpoint dosyası yolu
$endpointFile = __DIR__ . '/endpoints/' . $endpoint . '.php';

// Endpoint dosyası var mı kontrol et
if (!file_exists($endpointFile)) {
    Response::error(
        'Endpoint not found',
        'ENDPOINT_NOT_FOUND',
        404,
        [
            'endpoint' => $endpoint,
            'file_path' => $endpointFile,
            'request_uri' => $requestUri,
            'exists' => file_exists($endpointFile) ? 'yes' : 'no'
        ]
    );
}

// Request body'yi al (JSON parse)
$requestBody = file_get_contents('php://input');
$_POST_DATA = json_decode($requestBody, true);

// JSON parse hatası kontrolü
if ($requestBody && $_POST_DATA === null && json_last_error() !== JSON_ERROR_NONE) {
    Response::error('JSON parse hatası: ' . json_last_error_msg(), 'JSON_PARSE_ERROR', 400);
}

$_POST_DATA = $_POST_DATA ?? [];

// Endpoint dosyasını çalıştır
try {
    require_once $endpointFile;
} catch (Throwable $e) {
    Response::error(
        'Sunucu hatası: ' . $e->getMessage(),
        'SERVER_ERROR',
        500
    );
}
