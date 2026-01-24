<?php
/**
 * Golaks API - Entry Point
 * Modern PHP REST API
 */

// Config (must be loaded first)
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';

// Headers
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: ' . CORS_ALLOWED_ORIGINS);
header('Access-Control-Allow-Methods: ' . CORS_ALLOWED_METHODS);
header('Access-Control-Allow-Headers: ' . CORS_ALLOWED_HEADERS);

// Handle OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Autoloader (basit version, composer kullanılabilir)
spl_autoload_register(function ($class) {
    $file = __DIR__ . '/' . str_replace('\\', '/', $class) . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

// Router
require_once __DIR__ . '/routes/api.php';

// Handle Request
try {
    $router = new Router();
    $router->dispatch();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => [
            'message' => $e->getMessage(),
            'code' => 'INTERNAL_ERROR'
        ]
    ]);
}
