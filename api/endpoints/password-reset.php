<?php
/**
 * Password Reset Endpoint
 * Şifre sıfırlama işlemleri (talep, doğrulama, sıfırlama)
 */

header('Content-Type: application/json; charset=UTF-8');

// Sadece POST metoduna izin ver
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
}

try {
    $db = Database::getInstance();

    // Action parametresini al
    $action = $_POST_DATA['action'] ?? '';

    switch ($action) {
        case 'request':
            handleForgotPassword($db);
            break;

        case 'verify':
            handleVerifyResetCode($db);
            break;

        case 'reset':
            handleResetPassword($db);
            break;

        default:
            Response::error('Geçersiz action parametresi', 'INVALID_ACTION', 400);
    }

} catch (Exception $e) {
    error_log('Password reset error: ' . $e->getMessage());
    Response::error('Bir hata oluştu. Lütfen tekrar deneyin.', 'SERVER_ERROR', 500);
}

/**
 * Şifre sıfırlama talebi - Kod gönder
 */
function handleForgotPassword($db) {
    global $_POST_DATA;

    // Parametreleri al
    $email = $_POST_DATA['email'] ?? '';

    // Validasyon
    if (empty($email)) {
        Response::error('Email adresi gereklidir', 'EMAIL_REQUIRED', 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        Response::error('Geçerli bir email adresi giriniz', 'INVALID_EMAIL', 400);
    }

    // Kullanıcıyı bul
    $user = $db->fetchOne(
        "SELECT id, kullanici_adi, ad_soyad FROM mobil_kullanici WHERE kullanici_adi = ?",
        [$email]
    );

    if (!$user) {
        // Güvenlik: Email bulunamasa da başarılı mesajı döndür
        Response::success(null, 'Şifre sıfırlama kodu email adresinize gönderildi');
    }

    // 6 haneli rastgele kod oluştur
    $resetCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expiresAt = date('Y-m-d H:i:s', strtotime('+1 minute'));

    // Kullanıcı tablosuna sıfırlama kodunu kaydet
    $db->execute(
        "UPDATE mobil_kullanici
         SET sifre_sifirlama_token = ?,
             sifre_sifirlama_token_sure = ?
         WHERE id = ?",
        [$resetCode, $expiresAt, $user['id']]
    );

    // Email gönder
    $emailSent = sendPasswordResetEmail($email, $user['ad_soyad'], $resetCode);

    if (!$emailSent) {
        error_log("Password reset email failed for: {$email}");
        // Email başarısız olsa da kullanıcıya başarılı mesajı döndür (güvenlik için)
    }

    // Geliştirme ortamı için kodu loglayalım
    error_log("Password reset code for {$email}: {$resetCode}");

    Response::success([
        'email' => $email,
        'expiresIn' => 60 // 1 dakika
    ], 'Şifre sıfırlama kodu email adresinize gönderildi');
}

/**
 * Sıfırlama kodunu doğrula
 */
function handleVerifyResetCode($db) {
    global $_POST_DATA;

    // Parametreleri al
    $email = $_POST_DATA['email'] ?? '';
    $code = $_POST_DATA['code'] ?? '';

    // Validasyon
    if (empty($email)) {
        Response::error('Email adresi gereklidir', 'EMAIL_REQUIRED', 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        Response::error('Geçerli bir email adresi giriniz', 'INVALID_EMAIL', 400);
    }

    if (empty($code)) {
        Response::error('Doğrulama kodu gereklidir', 'CODE_REQUIRED', 400);
    }

    // Kullanıcıyı ve sıfırlama kodunu kontrol et
    $user = $db->fetchOne(
        "SELECT id, kullanici_adi, sifre_sifirlama_token, sifre_sifirlama_token_sure
         FROM mobil_kullanici
         WHERE kullanici_adi = ?",
        [$email]
    );

    if (!$user) {
        Response::error('Kullanıcı bulunamadı', 'USER_NOT_FOUND', 404);
    }

    // Kod kontrolü
    if (empty($user['sifre_sifirlama_token']) || $user['sifre_sifirlama_token'] !== $code) {
        Response::error('Geçersiz doğrulama kodu', 'INVALID_CODE', 400);
    }

    // Süre kontrolü
    if (empty($user['sifre_sifirlama_token_sure']) || strtotime($user['sifre_sifirlama_token_sure']) < time()) {
        Response::error('Doğrulama kodunun süresi dolmuş', 'CODE_EXPIRED', 400);
    }

    // Kod geçerli
    Response::success([
        'valid' => true,
        'email' => $user['kullanici_adi']
    ], 'Doğrulama kodu geçerli');
}

/**
 * Şifreyi sıfırla
 */
function handleResetPassword($db) {
    global $_POST_DATA;

    // Parametreleri al
    $email = $_POST_DATA['email'] ?? '';
    $code = $_POST_DATA['code'] ?? '';
    $newPassword = $_POST_DATA['newPassword'] ?? '';

    // Validasyon
    if (empty($email)) {
        Response::error('Email adresi gereklidir', 'EMAIL_REQUIRED', 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        Response::error('Geçerli bir email adresi giriniz', 'INVALID_EMAIL', 400);
    }

    if (empty($code)) {
        Response::error('Doğrulama kodu gereklidir', 'CODE_REQUIRED', 400);
    }

    if (empty($newPassword)) {
        Response::error('Yeni şifre gereklidir', 'PASSWORD_REQUIRED', 400);
    }

    if (strlen($newPassword) < 6) {
        Response::error('Şifre en az 6 karakter olmalıdır', 'PASSWORD_TOO_SHORT', 400);
    }

    // Kullanıcıyı ve sıfırlama kodunu kontrol et
    $user = $db->fetchOne(
        "SELECT id, kullanici_adi, ad_soyad, sifre_sifirlama_token, sifre_sifirlama_token_sure
         FROM mobil_kullanici
         WHERE kullanici_adi = ?",
        [$email]
    );

    if (!$user) {
        Response::error('Kullanıcı bulunamadı', 'USER_NOT_FOUND', 404);
    }

    // Kod ve süre kontrolü
    if (empty($user['sifre_sifirlama_token']) || $user['sifre_sifirlama_token'] !== $code) {
        Response::error('Geçersiz doğrulama kodu', 'INVALID_CODE', 400);
    }

    if (empty($user['sifre_sifirlama_token_sure']) || strtotime($user['sifre_sifirlama_token_sure']) < time()) {
        Response::error('Doğrulama kodunun süresi dolmuş', 'CODE_EXPIRED', 400);
    }

    // Şifreyi hashle
    $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);

    // Şifreyi güncelle ve sıfırlama token'ını temizle
    $db->execute(
        "UPDATE mobil_kullanici
         SET sifre = ?,
             sifre_sifirlama_token = NULL,
             sifre_sifirlama_token_sure = NULL,
             son_sifre_degisim_tarihi = NOW()
         WHERE id = ?",
        [$hashedPassword, $user['id']]
    );

    // Şifre değişikliği bildirim emaili gönder
    sendPasswordChangedEmail($user['kullanici_adi'], $user['ad_soyad']);

    Response::success([
        'userId' => $user['id'],
        'email' => $user['kullanici_adi'],
        'name' => $user['ad_soyad']
    ], 'Şifreniz başarıyla güncellendi');
}

/**
 * Şifre sıfırlama kodu email gönder
 */
function sendPasswordResetEmail($email, $name, $code) {
    $subject = "Golaks - Şifre Sıfırlama Kodu";

    $message = "
    <html>
    <head>
        <meta charset='UTF-8'>
    </head>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
        <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
            <div style='background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;'>
                <h1 style='margin: 0; font-size: 28px;'>Golaks</h1>
                <p style='margin: 10px 0 0 0; font-size: 16px;'>Şifre Sıfırlama</p>
            </div>
            <div style='background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;'>
                <p style='font-size: 16px;'>Merhaba <strong>{$name}</strong>,</p>
                <p style='font-size: 15px;'>Şifrenizi sıfırlamak için aşağıdaki kodu kullanın:</p>
                <div style='font-size: 36px; font-weight: bold; color: #3B82F6; letter-spacing: 10px; text-align: center; padding: 25px; background: white; border-radius: 10px; margin: 25px 0; border: 2px solid #3B82F6;'>
                    {$code}
                </div>
                <p style='font-size: 15px;'>Bu kod <strong>1 dakika</strong> içinde geçerliliğini yitirecektir.</p>
                <p style='color: #EF4444; font-size: 14px; margin-top: 20px; padding: 15px; background: #FEE2E2; border-left: 4px solid #EF4444; border-radius: 5px;'>
                    ⚠️ <strong>Güvenlik Uyarısı:</strong> Bu kodu kimseyle paylaşmayın.
                </p>
                <p style='font-size: 14px; color: #666;'>Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
            </div>
            <div style='text-align: center; color: #888; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;'>
                <p style='margin: 5px 0;'>Polaris Dış Ticaret Ltd. Şti.</p>
                <p style='margin: 5px 0;'>© 1995-" . date('Y') . " Golaks. Tüm Hakları Saklıdır.</p>
            </div>
        </div>
    </body>
    </html>
    ";

    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8\r\n";
    $headers .= "From: " . SMTP_FROM_NAME . " <" . SMTP_FROM_EMAIL . ">\r\n";
    $headers .= "Reply-To: " . SMTP_FROM_EMAIL . "\r\n";

    return mail($email, $subject, $message, $headers);
}

/**
 * Şifre değişikliği bildirim emaili gönder
 */
function sendPasswordChangedEmail($email, $name) {
    $subject = "Golaks - Şifreniz Değiştirildi";
    $date = date('d.m.Y H:i');

    $message = "
    <html>
    <head>
        <meta charset='UTF-8'>
    </head>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
        <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
            <div style='background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;'>
                <h1 style='margin: 0; font-size: 28px;'>Golaks</h1>
                <p style='margin: 10px 0 0 0; font-size: 16px;'>Şifre Değişikliği</p>
            </div>
            <div style='background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;'>
                <p style='font-size: 16px;'>Merhaba <strong>{$name}</strong>,</p>
                <p style='font-size: 15px;'>Hesabınızın şifresi başarıyla değiştirildi.</p>
                <div style='background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #10B981;'>
                    <p style='margin: 5px 0;'><strong>Değişiklik Tarihi:</strong> {$date}</p>
                    <p style='margin: 5px 0;'><strong>IP Adresi:</strong> " . ($_SERVER['REMOTE_ADDR'] ?? 'Bilinmiyor') . "</p>
                </div>
                <p style='color: #EF4444; font-size: 14px; margin-top: 20px; padding: 15px; background: #FEE2E2; border-left: 4px solid #EF4444; border-radius: 5px;'>
                    ⚠️ <strong>Güvenlik Uyarısı:</strong> Eğer bu değişikliği siz yapmadıysanız, lütfen derhal bizimle iletişime geçin ve hesabınızı güvence altına alın.
                </p>
            </div>
            <div style='text-align: center; color: #888; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;'>
                <p style='margin: 5px 0;'>Polaris Dış Ticaret Ltd. Şti.</p>
                <p style='margin: 5px 0;'>© 1995-" . date('Y') . " Golaks. Tüm Hakları Saklıdır.</p>
                <p style='margin: 10px 0 5px 0;'>İletişim: " . SMTP_FROM_EMAIL . "</p>
            </div>
        </div>
    </body>
    </html>
    ";

    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8\r\n";
    $headers .= "From: " . SMTP_FROM_NAME . " <" . SMTP_FROM_EMAIL . ">\r\n";
    $headers .= "Reply-To: " . SMTP_FROM_EMAIL . "\r\n";

    return mail($email, $subject, $message, $headers);
}
