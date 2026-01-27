<?php
/**
 * SMS Helper - İletimerkezi API
 * Global SMS gönderme servisi
 */

class SMS {
    private static $apiUrl;
    private static $username;
    private static $password;
    private static $sender;
    private static $enabled;

    /**
     * Initialize SMS configuration
     */
    public static function init() {
        self::$enabled = getenv('SMS_ENABLED') === 'true';
        self::$username = getenv('SMS_USERNAME');
        self::$password = getenv('SMS_PASSWORD');
        self::$sender = getenv('SMS_SENDER') ?: 'GOLAKS';
        self::$apiUrl = getenv('SMS_API_URL') ?: 'http://api.iletimerkezi.com/v1/send-sms';
    }

    /**
     * Send SMS
     *
     * @param string $phone Telefon numarası
     * @param string $message SMS içeriği
     * @return array ['success' => bool, 'message' => string, 'data' => array]
     */
    public static function send($phone, $message) {
        // Initialize if not already done
        if (self::$enabled === null) {
            self::init();
        }

        // Check if SMS is enabled
        if (!self::$enabled) {
            return [
                'success' => false,
                'message' => 'SMS servisi devre dışı',
                'error' => 'SMS_DISABLED'
            ];
        }

        // Validate credentials
        if (empty(self::$username) || empty(self::$password) || empty(self::$sender)) {
            return [
                'success' => false,
                'message' => 'SMS yapılandırması eksik',
                'error' => 'SMS_CONFIG_ERROR'
            ];
        }

        // Format phone number
        $phone = self::formatPhone($phone);
        if (!$phone) {
            return [
                'success' => false,
                'message' => 'Geçersiz telefon numarası',
                'error' => 'INVALID_PHONE'
            ];
        }

        // Prepare XML request
        $sendDateTime = date("d/m/Y H:i");
        $username = self::$username;
        $password = self::$password;
        $sender = self::$sender;

        // Escape special characters for XML
        $message = htmlspecialchars($message, ENT_XML1, 'UTF-8');

        $xmlRequest = <<<XML
<request>
  <authentication>
    <username>{$username}</username>
    <password>{$password}</password>
  </authentication>
  <order>
      <sender>{$sender}</sender>
      <sendDateTime>{$sendDateTime}</sendDateTime>
      <message>
          <text>{$message}</text>
          <receipents>
              <number>{$phone}</number>
          </receipents>
      </message>
  </order>
</request>
XML;

        try {
            // Send request
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, self::$apiUrl);
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $xmlRequest);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 1);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: text/xml']);
            curl_setopt($ch, CURLOPT_HEADER, 0);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
            curl_setopt($ch, CURLOPT_TIMEOUT, 120);

            $response = curl_exec($ch);
            $curlError = curl_error($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($curlError) {
                throw new Exception("cURL Error: " . $curlError);
            }

            // Parse response (XML)
            $xml = @simplexml_load_string($response);

            if ($xml === false) {
                throw new Exception("Invalid XML response");
            }

            // Check response status
            $status = (string)$xml->status->code;
            $statusMessage = (string)$xml->status->message;

            if ($status === '200') {
                return [
                    'success' => true,
                    'message' => 'SMS başarıyla gönderildi',
                    'data' => [
                        'order_id' => (string)$xml->order->id,
                        'status' => $status
                    ]
                ];
            } else {
                return [
                    'success' => false,
                    'message' => $statusMessage ?: 'SMS gönderilemedi',
                    'error' => 'SMS_SEND_FAILED',
                    'error_code' => $status
                ];
            }

        } catch (Exception $e) {
            // Log error
            error_log('SMS Error: ' . $e->getMessage());

            return [
                'success' => false,
                'message' => 'SMS gönderilemedi: ' . $e->getMessage(),
                'error' => 'SMS_ERROR'
            ];
        }
    }

    /**
     * Send verification code
     *
     * @param string $phone Telefon numarası
     * @param string $code Doğrulama kodu
     * @return array
     */
    public static function sendVerificationCode($phone, $code) {
        $message = "Golaks doğrulama kodunuz: {$code}\n\nBu kodu kimseyle paylaşmayın.\n\n- Polaris Dış Ticaret";
        return self::send($phone, $message);
    }

    /**
     * Send password reset code
     *
     * @param string $phone Telefon numarası
     * @param string $code Sıfırlama kodu
     * @return array
     */
    public static function sendPasswordResetCode($phone, $code) {
        $message = "Golaks şifre sıfırlama kodunuz: {$code}\n\nBu kod 1 saat geçerlidir.\n\n- Polaris Dış Ticaret";
        return self::send($phone, $message);
    }

    /**
     * Format phone number to Turkish format with country code
     *
     * @param string $phone
     * @return string|false Formatted phone or false if invalid
     */
    private static function formatPhone($phone) {
        // Remove all non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);

        // Ensure phone number starts with 90 (Turkey country code)
        if (substr($phone, 0, 2) !== '90') {
            if (substr($phone, 0, 1) === '0') {
                // 05xxxxxxxxx -> 905xxxxxxxxx
                $phone = '9' . $phone;
            } else {
                // 5xxxxxxxxx -> 905xxxxxxxxx
                $phone = '90' . $phone;
            }
        }

        // Check if valid Turkish mobile number (905xxxxxxxxx = 12 digits)
        if (strlen($phone) === 12 && substr($phone, 0, 3) === '905') {
            return $phone;
        }

        return false;
    }
}

// Auto-initialize
SMS::init();
