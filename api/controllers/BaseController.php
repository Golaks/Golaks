<?php
/**
 * Base Controller
 * All controllers extend this
 */

class BaseController {
    protected $db;
    protected $tenantDb;
    protected $requestData;
    protected $headers;

    public function __construct() {
        $this->requestData = $this->getRequestData();
        $this->headers = $this->getHeaders();
    }

    /**
     * Get request data (JSON body)
     */
    protected function getRequestData() {
        $input = file_get_contents('php://input');
        return json_decode($input, true) ?? [];
    }

    /**
     * Get request headers
     */
    protected function getHeaders() {
        return getallheaders();
    }

    /**
     * Get header value
     */
    protected function getHeader($name, $default = null) {
        return $this->headers[$name] ?? $default;
    }

    /**
     * Get Authorization token
     */
    protected function getBearerToken() {
        $auth = $this->getHeader('Authorization', '');
        if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
            return $matches[1];
        }
        return null;
    }

    /**
     * Get Tenant ID from header
     */
    protected function getTenantId() {
        return $this->getHeader('X-Tenant-ID');
    }

    /**
     * Send JSON response
     */
    protected function sendResponse($data, $statusCode = 200) {
        http_response_code($statusCode);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * Send success response
     */
    protected function sendSuccess($data = null, $message = null) {
        $response = ['success' => true];
        if ($data !== null) {
            $response['data'] = $data;
        }
        if ($message !== null) {
            $response['message'] = $message;
        }
        $this->sendResponse($response);
    }

    /**
     * Send error response
     */
    protected function sendError($message, $code = 'ERROR', $statusCode = 400) {
        $this->sendResponse([
            'success' => false,
            'error' => [
                'message' => $message,
                'code' => $code
            ]
        ], $statusCode);
    }

    /**
     * Validate required fields
     */
    protected function validateRequired($fields) {
        $missing = [];
        foreach ($fields as $field) {
            if (!isset($this->requestData[$field]) || empty($this->requestData[$field])) {
                $missing[] = $field;
            }
        }

        if (!empty($missing)) {
            $this->sendError(
                'Missing required fields: ' . implode(', ', $missing),
                'VALIDATION_ERROR',
                400
            );
        }
    }

    /**
     * Verify JWT token and return payload
     */
    protected function verifyToken() {
        $token = $this->getBearerToken();
        if (!$token) {
            $this->sendError('No token provided', 'NO_TOKEN', 401);
        }

        require_once UTILS_PATH . '/JWT.php';
        $payload = JWT::decode($token, JWT_SECRET_KEY);

        if (!$payload) {
            $this->sendError('Invalid or expired token', 'INVALID_TOKEN', 401);
        }

        return $payload;
    }

    /**
     * Get Auth database connection
     */
    protected function getAuthDb() {
        if (!$this->db) {
            $this->db = Database::getInstance()->getConnection();
        }
        return $this->db;
    }

    /**
     * Get Tenant database connection
     * For now, returns the same connection (single database)
     */
    protected function getTenantDb($tenantId = null) {
        if (!$this->tenantDb) {
            $this->tenantDb = Database::getInstance()->getConnection();
        }
        return $this->tenantDb;
    }
}
