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

    /**
     * Mobil versiyon kontrolü
     * GET /api/health/version-check?platform=ios&version=1.1.3
     */
    public function versionCheck() {
        $platform = $_GET['platform'] ?? '';
        $currentVersion = $_GET['version'] ?? '';

        if (empty($platform) || empty($currentVersion)) {
            $this->sendError('platform ve version parametreleri gerekli', 'VALIDATION_ERROR', 400);
            return;
        }

        $minVersion = $platform === 'ios'
            ? MOBILE_MIN_VERSION_IOS
            : MOBILE_MIN_VERSION_ANDROID;

        $needsUpdate = version_compare($currentVersion, $minVersion, '<');

        $this->sendSuccess([
            'needsUpdate' => $needsUpdate,
            'minVersion' => $minVersion,
            'currentVersion' => $currentVersion,
            'platform' => $platform,
            'storeUrl' => $platform === 'ios'
                ? 'https://apps.apple.com/app/golaks/id6740043498'
                : 'https://play.google.com/store/apps/details?id=com.golaks.golaksmobile',
        ]);
    }
}
