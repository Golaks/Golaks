<?php
/**
 * API Routes
 */

class Router {
    private $routes = [];
    private $method;
    private $path;

    public function __construct() {
        $this->method = $_SERVER['REQUEST_METHOD'];
        $this->path = $this->getPath();
        $this->registerRoutes();
    }

    /**
     * Get request path
     */
    private function getPath() {
        $path = $_SERVER['REQUEST_URI'];
        // Remove query string
        if (($pos = strpos($path, '?')) !== false) {
            $path = substr($path, 0, $pos);
        }
        // Remove API prefix
        $path = str_replace(API_PREFIX, '', $path);
        return rtrim($path, '/') ?: '/';
    }

    /**
     * Register all routes
     */
    private function registerRoutes() {
        // Authentication Routes
        $this->post('/auth/login', 'AuthController', 'login');
        $this->post('/auth/logout', 'AuthController', 'logout');
        $this->post('/auth/refresh', 'AuthController', 'refresh');
        $this->post('/auth/forgot-password', 'AuthController', 'forgotPassword');
        $this->post('/auth/reset-password', 'AuthController', 'resetPassword');

        // Tenant Routes
        $this->get('/tenant/info', 'TenantController', 'info');
        $this->get('/tenant/list', 'TenantController', 'list');
        $this->post('/tenant/switch', 'TenantController', 'switch');

        // User Routes (Protected)
        $this->get('/user/profile', 'UserController', 'profile');
        $this->put('/user/profile', 'UserController', 'updateProfile');

        // Data Routes (Protected, Tenant-specific)
        $this->get('/data/dashboard', 'DataController', 'dashboard');
        $this->get('/data/products', 'DataController', 'products');
        $this->get('/data/customers', 'DataController', 'customers');

        // Health Check
        $this->get('/health', 'HealthController', 'check');
    }

    /**
     * Register GET route
     */
    private function get($path, $controller, $method) {
        $this->routes['GET'][$path] = ['controller' => $controller, 'method' => $method];
    }

    /**
     * Register POST route
     */
    private function post($path, $controller, $method) {
        $this->routes['POST'][$path] = ['controller' => $controller, 'method' => $method];
    }

    /**
     * Register PUT route
     */
    private function put($path, $controller, $method) {
        $this->routes['PUT'][$path] = ['controller' => $controller, 'method' => $method];
    }

    /**
     * Register DELETE route
     */
    private function delete($path, $controller, $method) {
        $this->routes['DELETE'][$path] = ['controller' => $controller, 'method' => $method];
    }

    /**
     * Dispatch request to appropriate controller
     */
    public function dispatch() {
        if (!isset($this->routes[$this->method][$this->path])) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => [
                    'message' => 'Route not found',
                    'code' => 'ROUTE_NOT_FOUND'
                ]
            ]);
            return;
        }

        $route = $this->routes[$this->method][$this->path];
        $controllerName = $route['controller'];
        $methodName = $route['method'];

        // Load controller
        $controllerFile = CONTROLLERS_PATH . '/' . $controllerName . '.php';
        if (!file_exists($controllerFile)) {
            throw new Exception("Controller not found: " . $controllerName);
        }

        require_once $controllerFile;

        if (!class_exists($controllerName)) {
            throw new Exception("Controller class not found: " . $controllerName);
        }

        $controller = new $controllerName();

        if (!method_exists($controller, $methodName)) {
            throw new Exception("Method not found: " . $methodName);
        }

        // Execute controller method
        $controller->$methodName();
    }
}
