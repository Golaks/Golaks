<?php
/**
 * JWT (JSON Web Token) Utility
 * Simple JWT implementation
 */

class JWT {
    /**
     * Encode payload to JWT
     */
    public static function encode($payload, $secret) {
        // Header
        $header = json_encode([
            'typ' => 'JWT',
            'alg' => 'HS256'
        ]);

        // Payload - add expiry
        $payload['iat'] = time();
        $payload['exp'] = time() + JWT_EXPIRY;
        $payloadJson = json_encode($payload);

        // Base64 encode
        $base64Header = self::base64UrlEncode($header);
        $base64Payload = self::base64UrlEncode($payloadJson);

        // Signature
        $signature = hash_hmac('sha256', $base64Header . '.' . $base64Payload, $secret, true);
        $base64Signature = self::base64UrlEncode($signature);

        // JWT
        return $base64Header . '.' . $base64Payload . '.' . $base64Signature;
    }

    /**
     * Decode JWT and verify
     */
    public static function decode($jwt, $secret) {
        // Split token
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            return false;
        }

        list($base64Header, $base64Payload, $base64Signature) = $parts;

        // Verify signature
        $expectedSignature = hash_hmac('sha256', $base64Header . '.' . $base64Payload, $secret, true);
        $expectedBase64Signature = self::base64UrlEncode($expectedSignature);

        if ($base64Signature !== $expectedBase64Signature) {
            return false;
        }

        // Decode payload
        $payload = json_decode(self::base64UrlDecode($base64Payload), true);

        // Check expiry
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false;
        }

        return $payload;
    }

    /**
     * Create refresh token
     */
    public static function createRefreshToken($payload, $secret) {
        $payload['iat'] = time();
        $payload['exp'] = time() + REFRESH_TOKEN_EXPIRY;
        $payload['type'] = 'refresh';
        return self::encode($payload, $secret);
    }

    /**
     * Base64 URL encode
     */
    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL decode
     */
    private static function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    /**
     * Generate random token
     */
    public static function generateRandomToken($length = 32) {
        return bin2hex(random_bytes($length));
    }
}
