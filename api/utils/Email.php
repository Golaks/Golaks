<?php
/**
 * Email Helper - PHPMailer SMTP
 * Global email gönderme servisi
 */

// Load composer autoload
require_once dirname(__DIR__) . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

class Email {
    private static $enabled;
    private static $host;
    private static $port;
    private static $username;
    private static $password;
    private static $fromEmail;
    private static $fromName;
    private static $encryption;

    /**
     * Initialize Email configuration
     */
    public static function init() {
        self::$enabled = getenv('SMTP_ENABLED') === 'true';
        self::$host = getenv('SMTP_HOST');
        self::$port = getenv('SMTP_PORT') ?: 587;
        self::$username = getenv('SMTP_USERNAME');
        self::$password = getenv('SMTP_PASSWORD');
        self::$fromEmail = getenv('SMTP_FROM_EMAIL') ?: 'noreply@golaks.com';
        self::$fromName = getenv('SMTP_FROM_NAME') ?: 'Golaks';
        self::$encryption = getenv('SMTP_ENCRYPTION') ?: 'tls';
    }

    /**
     * Send Email using PHPMailer
     *
     * @param string $to Recipient email address
     * @param string $subject Email subject
     * @param string $htmlBody HTML email body
     * @param string $textBody Plain text email body (optional)
     * @return array ['success' => bool, 'message' => string]
     */
    public static function send($to, $subject, $htmlBody, $textBody = null) {
        // Initialize if not already done
        if (self::$enabled === null) {
            self::init();
        }

        // Check if email is enabled
        if (!self::$enabled) {
            return [
                'success' => false,
                'message' => 'Email servisi devre dışı',
                'error' => 'EMAIL_DISABLED'
            ];
        }

        // Validate email
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return [
                'success' => false,
                'message' => 'Geçersiz email adresi',
                'error' => 'INVALID_EMAIL'
            ];
        }

        try {
            $mail = new PHPMailer(true);

            // Server settings
            $mail->isSMTP();
            $mail->Host       = self::$host;
            $mail->SMTPAuth   = true;
            $mail->Username   = self::$username;
            $mail->Password   = self::$password;
            $mail->SMTPSecure = self::$encryption === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = self::$port;
            $mail->CharSet    = 'UTF-8';

            // Recipients
            $mail->setFrom(self::$fromEmail, self::$fromName);
            $mail->addAddress($to);

            // Content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $htmlBody;
            if ($textBody) {
                $mail->AltBody = $textBody;
            }

            $mail->send();

            return [
                'success' => true,
                'message' => 'Email başarıyla gönderildi'
            ];

        } catch (PHPMailerException $e) {
            error_log('Email Error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Email gönderilemedi: ' . $e->getMessage(),
                'error' => 'EMAIL_ERROR'
            ];
        } catch (\Exception $e) {
            error_log('Email Error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Email gönderilemedi: ' . $e->getMessage(),
                'error' => 'EMAIL_ERROR'
            ];
        }
    }

    /**
     * Send password reset code email
     *
     * @param string $email Recipient email address
     * @param string $name User's name
     * @param string $code 6-digit reset code
     * @return array
     */
    public static function sendPasswordResetCode($email, $name, $code) {
        $subject = "Golaks - Şifre Sıfırlama Kodu";

        $htmlBody = "
        <html>
        <head>
            <meta charset='UTF-8'>
        </head>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;'>
                    <h1 style='margin: 0;'>Golaks</h1>
                    <p style='margin: 10px 0 0 0;'>Şifre Sıfırlama</p>
                </div>
                <div style='background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;'>
                    <p>Merhaba <strong>{$name}</strong>,</p>
                    <p>Şifrenizi sıfırlamak için aşağıdaki kodu kullanın:</p>
                    <div style='font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; text-align: center; padding: 20px; background: white; border-radius: 10px; margin: 20px 0;'>
                        {$code}
                    </div>
                    <p>Bu kod <strong>1 saat</strong> içinde geçerliliğini yitirecektir.</p>
                    <p style='color: #e74c3c; font-size: 14px; margin-top: 20px;'>⚠️ Bu kodu kimseyle paylaşmayın.</p>
                    <p>Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
                </div>
                <div style='text-align: center; color: #888; font-size: 12px; margin-top: 20px;'>
                    <p>© " . date('Y') . " Golaks - Polaris Dış Ticaret</p>
                </div>
            </div>
        </body>
        </html>
        ";

        $textBody = "Golaks - Şifre Sıfırlama\n\n";
        $textBody .= "Merhaba {$name},\n\n";
        $textBody .= "Şifrenizi sıfırlamak için aşağıdaki kodu kullanın:\n\n";
        $textBody .= "Kod: {$code}\n\n";
        $textBody .= "Bu kod 1 saat içinde geçerliliğini yitirecektir.\n\n";
        $textBody .= "Bu kodu kimseyle paylaşmayın.\n\n";
        $textBody .= "- Polaris Dış Ticaret";

        return self::send($email, $subject, $htmlBody, $textBody);
    }
}

// Auto-initialize
Email::init();
