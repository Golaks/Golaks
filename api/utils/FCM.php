<?php
/**
 * Firebase Cloud Messaging (FCM) HTTP v1 API Helper
 * Sends push notifications via Google FCM
 */

class FCM {
    private static $projectId = null;
    private static $accessToken = null;
    private static $tokenExpiry = 0;

    /**
     * Get Firebase project ID from service account
     */
    private static function getProjectId(): string {
        if (self::$projectId) {
            return self::$projectId;
        }

        $credentials = self::getServiceAccountCredentials();
        self::$projectId = $credentials['project_id'];
        return self::$projectId;
    }

    /**
     * Load service account credentials from JSON file
     */
    private static function getServiceAccountCredentials(): array {
        $path = Env::get('FIREBASE_SERVICE_ACCOUNT_PATH', BASE_PATH . '/config/golaks-mobile-app-firebase-adminsdk-fbsvc-d60038cb0a.json');

        if (!file_exists($path)) {
            throw new Exception("Firebase service account dosyası bulunamadı: {$path}");
        }

        $json = json_decode(file_get_contents($path), true);
        if (!$json) {
            throw new Exception('Firebase service account dosyası okunamadı');
        }

        return $json;
    }

    /**
     * Generate OAuth2 access token from service account (JWT → token exchange)
     */
    private static function getAccessToken(): string {
        // Return cached token if still valid
        if (self::$accessToken && time() < self::$tokenExpiry - 60) {
            return self::$accessToken;
        }

        $credentials = self::getServiceAccountCredentials();

        $now = time();
        $header = self::base64UrlEncode(json_encode([
            'alg' => 'RS256',
            'typ' => 'JWT',
        ]));

        $payload = self::base64UrlEncode(json_encode([
            'iss' => $credentials['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ]));

        $signInput = "{$header}.{$payload}";

        // Sign with private key
        $privateKey = openssl_pkey_get_private($credentials['private_key']);
        if (!$privateKey) {
            $opensslError = openssl_error_string();
            error_log("FCM DEBUG: openssl_pkey_get_private failed: {$opensslError}");
            throw new Exception("Firebase private key okunamadı: {$opensslError}");
        }

        $signResult = openssl_sign($signInput, $signature, $privateKey, OPENSSL_ALGO_SHA256);
        if (!$signResult) {
            $opensslError = openssl_error_string();
            error_log("FCM DEBUG: openssl_sign failed: {$opensslError}");
            throw new Exception("JWT imzalanamadı: {$opensslError}");
        }

        $jwt = "{$signInput}." . self::base64UrlEncode($signature);
        error_log("FCM DEBUG: JWT created, length=" . strlen($jwt));
        error_log("FCM DEBUG: client_email=" . $credentials['client_email']);

        // Exchange JWT for access token
        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_TIMEOUT => 10,
        ]);

        $response = curl_exec($ch);
        $curlError = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        error_log("FCM DEBUG: OAuth2 response: HTTP {$httpCode} - {$response}");
        if ($curlError) {
            error_log("FCM DEBUG: curl error: {$curlError}");
        }

        if ($httpCode !== 200) {
            throw new Exception("FCM OAuth2 token alınamadı: HTTP {$httpCode} - {$response}");
        }

        $data = json_decode($response, true);
        self::$accessToken = $data['access_token'];
        self::$tokenExpiry = $now + ($data['expires_in'] ?? 3600);

        return self::$accessToken;
    }

    /**
     * Send push notification to a single device
     *
     * @param string $fcmToken Device FCM token
     * @param string $title Notification title
     * @param string $body Notification body/message
     * @param array $data Optional data payload
     * @return bool Success status
     */
    public static function sendToDevice(string $fcmToken, string $title, string $body, array $data = []): bool {
        try {
            $projectId = self::getProjectId();
            $accessToken = self::getAccessToken();

            $message = [
                'message' => [
                    'token' => $fcmToken,
                    'notification' => [
                        'title' => $title,
                        'body' => $body,
                    ],
                    'data' => array_map('strval', $data),
                    'apns' => [
                        'payload' => [
                            'aps' => [
                                'sound' => 'default',
                                'badge' => 1,
                            ],
                        ],
                    ],
                    'android' => [
                        'notification' => [
                            'sound' => 'default',
                            'channel_id' => 'default',
                        ],
                    ],
                ],
            ];

            $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

            $jsonBody = json_encode($message);
            error_log("FCM DEBUG: URL={$url}");
            error_log("FCM DEBUG: access_token length=" . strlen($accessToken));
            error_log("FCM DEBUG: request body=" . $jsonBody);

            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $jsonBody,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $accessToken,
                ],
                CURLOPT_TIMEOUT => 10,
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                return true;
            }

            error_log("FCM send failed for token {$fcmToken}: HTTP {$httpCode} - {$response}");
            return false;

        } catch (Exception $e) {
            error_log("FCM send error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Send push notification to multiple devices
     *
     * @param array $fcmTokens Array of device FCM tokens
     * @param string $title Notification title
     * @param string $body Notification body/message
     * @param array $data Optional data payload
     * @return array ['success' => int, 'failure' => int]
     */
    public static function sendToMultipleDevices(array $fcmTokens, string $title, string $body, array $data = []): array {
        $success = 0;
        $failure = 0;

        foreach ($fcmTokens as $token) {
            if (empty($token)) {
                $failure++;
                continue;
            }

            if (self::sendToDevice($token, $title, $body, $data)) {
                $success++;
            } else {
                $failure++;
            }
        }

        return ['success' => $success, 'failure' => $failure];
    }

    /**
     * Base64 URL-safe encoding
     */
    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
