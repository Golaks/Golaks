<?php
/**
 * Health Check Controller
 * API durumunu kontrol eder
 */

require_once __DIR__ . '/BaseController.php';

class HealthController extends BaseController {
    /**
     * Health check endpoint
     * GET /api/health
     */
    public function check() {
        $this->sendSuccess([
            'status' => 'healthy',
            'app' => APP_NAME,
            'version' => APP_VERSION,
            'environment' => APP_ENV,
            'timestamp' => date('Y-m-d H:i:s'),
            'timezone' => date_default_timezone_get()
        ]);
    }
}
