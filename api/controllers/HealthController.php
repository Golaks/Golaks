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

        $latestVersion = $this->getStoreVersion($platform);

        $needsUpdate = version_compare($currentVersion, $minVersion, '<');
        $isOutdated = $latestVersion
            ? version_compare($currentVersion, $latestVersion, '<')
            : false;

        $this->sendSuccess([
            'needsUpdate' => $needsUpdate,
            'isOutdated' => $isOutdated,
            'minVersion' => $minVersion,
            'latestVersion' => $latestVersion,
            'currentVersion' => $currentVersion,
            'platform' => $platform,
            'storeUrl' => $platform === 'ios'
                ? 'https://apps.apple.com/app/golaks/id6740043498'
                : 'https://play.google.com/store/apps/details?id=com.golaks.golaksmobile',
        ]);
    }

    /**
     * Mağazadan en güncel sürümü çeker (30 dk cache).
     * iOS: iTunes Lookup API
     * Android: Play Store HTML scrape
     */
    private function getStoreVersion($platform) {
        $cacheFile = sys_get_temp_dir() . "/golaks_store_version_{$platform}.json";
        $cacheTtl = 1800; // 30 dakika

        if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTtl) {
            $cached = json_decode(@file_get_contents($cacheFile), true);
            if (!empty($cached['version'])) {
                return $cached['version'];
            }
        }

        $version = null;
        try {
            if ($platform === 'ios') {
                $bundleId = 'com.golaks.golaksmobile';
                $url = "https://itunes.apple.com/lookup?bundleId={$bundleId}&country=tr";
                $body = $this->fetchUrl($url);
                if ($body) {
                    $data = json_decode($body, true);
                    $version = $data['results'][0]['version'] ?? null;
                }
            } elseif ($platform === 'android') {
                $packageName = 'com.golaks.golaksmobile';
                $url = "https://play.google.com/store/apps/details?id={$packageName}&hl=en&gl=US";
                $body = $this->fetchUrl($url);
                if ($body) {
                    // Play Store HTML formatları zaman zaman değişir; iki pattern dene
                    if (preg_match('/\[\[\["(\d+\.\d+(?:\.\d+)?)"\]\]/', $body, $m)) {
                        $version = $m[1];
                    } elseif (preg_match('/Current Version.*?(\d+\.\d+(?:\.\d+)?)/s', $body, $m)) {
                        $version = $m[1];
                    }
                }
            }
        } catch (Exception $e) {
            error_log('getStoreVersion error: ' . $e->getMessage());
        }

        if ($version) {
            @file_put_contents($cacheFile, json_encode(['version' => $version, 'fetchedAt' => time()]));
        }
        return $version;
    }

    private function fetchUrl($url) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT        => 6,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_HTTPHEADER     => [
                'User-Agent: Mozilla/5.0 (compatible; GolaksUpdateCheck/1.0)',
            ],
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ($code === 200 && $body) ? $body : null;
    }
}
