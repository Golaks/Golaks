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
        // Remove common base paths
        $path = preg_replace('#^/Golaks(/|$)#', '/', $path);
        $path = preg_replace('#^/index\.php(/|$)#', '/', $path);
        // Remove API prefix
        $path = str_replace(API_PREFIX, '', $path);
        return rtrim($path, '/') ?: '/';
    }

    /**
     * Register all routes
     */
    private function registerRoutes() {
        // Root endpoint
        $this->get('/', 'HealthController', 'check');

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
        $this->put('/user/change-password', 'UserController', 'changePassword');
        $this->put('/user/notifications', 'UserController', 'updateNotifications');
        $this->post('/user/upload-photo', 'UserController', 'uploadPhoto');

        // User Management Routes (Protected, Admin/SuperAdmin only)
        $this->get('/user/list', 'UserController', 'getList');
        $this->post('/user/create', 'UserController', 'create');
        $this->put('/user/update', 'UserController', 'update');
        $this->delete('/user/delete', 'UserController', 'delete');

        // Notification Routes (Protected)
        $this->get('/notifications', 'NotificationController', 'getNotifications');
        $this->get('/notifications/unread', 'NotificationController', 'getUnreadNotifications');
        $this->put('/notifications/mark-all-read', 'NotificationController', 'markAllAsRead');
        $this->put('/notifications/:id/read', 'NotificationController', 'markAsRead');
        $this->delete('/notifications/:id', 'NotificationController', 'deleteNotification');
        $this->post('/notifications/send', 'NotificationController', 'sendNotification');

        // Account Routes (Protected, Company-specific)
        $this->post('/account/cari-list', 'AccountController', 'getCariList');
        $this->post('/account/cari-balance', 'AccountController', 'getCariBalance');
        $this->post('/account/cash-bank-summary', 'AccountController', 'getCashBankSummary');

        // Company Routes (Protected, Super Admin only)
        $this->get('/company/list', 'CompanyController', 'getList');
        $this->post('/company/list', 'CompanyController', 'create');
        $this->put('/company/list', 'CompanyController', 'update');
        $this->delete('/company/list', 'CompanyController', 'delete');

        // Data Routes (Protected, Tenant-specific)
        $this->get('/data/dashboard', 'DataController', 'dashboard');
        $this->get('/data/products', 'DataController', 'products');
        $this->get('/data/customers', 'DataController', 'customers');

        // App Routes (Protected, Tenant-specific)
        require ROUTES_PATH . '/apps/account.php';
        require ROUTES_PATH . '/apps/tannery.php';
        require ROUTES_PATH . '/apps/confection.php';
        require ROUTES_PATH . '/apps/shop.php';

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
        $route = null;

        // First, try exact match
        if (isset($this->routes[$this->method][$this->path])) {
            $route = $this->routes[$this->method][$this->path];
        } else {
            // Try pattern matching for dynamic routes
            foreach ($this->routes[$this->method] ?? [] as $pattern => $routeData) {
                // Convert :id to regex pattern
                $regexPattern = preg_replace('/:\w+/', '(\d+)', $pattern);
                $regexPattern = '#^' . $regexPattern . '$#';

                if (preg_match($regexPattern, $this->path)) {
                    $route = $routeData;
                    break;
                }
            }
        }

        if (!$route) {
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
        $controllerName = $route['controller'];
        $methodName = $route['method'];

        // Load controller - Check for app-specific controllers first
        $controllerFile = CONTROLLERS_PATH . '/' . $controllerName . '.php';

        // Check if controller is in apps subdirectory
        // Note: AccountController is in root controllers/, not in apps/account/
        if (strpos($controllerName, 'AccountReport') === 0 || strpos($controllerName, 'AccountTransaction') === 0) {
            $controllerFile = CONTROLLERS_PATH . '/apps/account/' . str_replace('Account', '', $controllerName) . '.php';
        } elseif (strpos($controllerName, 'Tannery') === 0) {
            $controllerFile = CONTROLLERS_PATH . '/apps/tannery/' . str_replace('Tannery', '', $controllerName) . '.php';
        } elseif (strpos($controllerName, 'Confection') === 0) {
            $controllerFile = CONTROLLERS_PATH . '/apps/confection/' . str_replace('Confection', '', $controllerName) . '.php';
        } elseif (strpos($controllerName, 'Shop') === 0) {
            $controllerFile = CONTROLLERS_PATH . '/apps/shop/' . str_replace('Shop', '', $controllerName) . '.php';
        }

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
