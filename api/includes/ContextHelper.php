<?php
/**
 * ContextHelper - Kullanıcı Bağlam Yardımcısı
 *
 * Giriş yapan kullanıcının firma, şube ve veritabanı bilgilerini
 * standart şekilde alır. Tüm controller'lar bu sınıfı kullanmalıdır.
 *
 * Kullanım:
 *   $ctx = ContextHelper::get();
 *   // $ctx['pdo']       → Firma DB PDO bağlantısı
 *   // $ctx['firmaId']   → Şirket DB'sindeki gerçek firma ID (firmalar.id)
 *   // $ctx['subeId']    → Kullanıcının varsayılan şube ID (subeler.id)
 *   // $ctx['userId']    → Mobil kullanıcı ID (mobil_kullanici.id)
 *   // $ctx['mobilFirmaId'] → Mobil platform firma ID (mobil_firmalar.id)
 *   // $ctx['yetkiler']  → Kullanıcı yetkileri JSON
 *   // $ctx['subeYetkileri'] → Yetkili şube ID'leri array
 */

class ContextHelper {

    private static ?array $cachedContext = null;

    /**
     * Kullanıcı bağlamını döner
     * JWT token'dan user_id alır, firma DB'sine bağlanır
     *
     * @return array
     */
    public static function get(): array {
        if (self::$cachedContext !== null) {
            return self::$cachedContext;
        }

        // 1. JWT'den kullanıcı ID al
        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $db = Database::getInstance();

        // 2. Mobil kullanıcı bilgileri
        $mobilKullanici = $db->fetchOne(
            "SELECT mobil_firmalar_id, kullanici_yetkiler, ad_soyad FROM mobil_kullanici WHERE id = ?",
            [$userId]
        );

        if (!$mobilKullanici || !$mobilKullanici['mobil_firmalar_id']) {
            Response::error('Kullanıcı firma bilgisi bulunamadı', 'USER_FIRMA_NOT_FOUND', 404);
            exit;
        }

        $mobilFirmaId = (int)$mobilKullanici['mobil_firmalar_id'];

        // 3. Kullanıcı yetkileri
        $yetkiler = !empty($mobilKullanici['kullanici_yetkiler'])
            ? json_decode($mobilKullanici['kullanici_yetkiler'], true) : [];
        $varsayilanSube = (int)($yetkiler['varsayilan_sube'] ?? 0);
        $subeYetkileri = $yetkiler['sube_yetkileri'] ?? [];

        // 4. Firma ayarları
        $firma = $db->fetchOne(
            "SELECT firma_ayarlar FROM mobil_firmalar WHERE id = ?",
            [$mobilFirmaId]
        );

        if (!$firma || empty($firma['firma_ayarlar'])) {
            Response::error('Firma ayarları bulunamadı', 'FIRMA_SETTINGS_NOT_FOUND', 404);
            exit;
        }

        $firmaAyarlar = json_decode($firma['firma_ayarlar'], true) ?: [];

        // 5. Firma veritabanı bağlantısı
        $veritabani = $firmaAyarlar['veritabani'] ?? [];
        $dbServer = $veritabani['sunucu'] ?? '';
        $dbPort = (int)($veritabani['port'] ?? 3306);
        $dbUser = $veritabani['kullanici'] ?? '';
        $dbPass = $veritabani['sifre'] ?? '';
        $dbName = $veritabani['veriAdi'] ?? '';

        if (empty($dbServer) || empty($dbUser) || empty($dbName)) {
            Response::error('Firma veritabanı ayarları eksik', 'DB_CONFIG_MISSING', 400);
            exit;
        }

        $dsn = "mysql:host={$dbServer};port={$dbPort};dbname={$dbName};charset=utf8mb4";
        $pdo = new PDO($dsn, $dbUser, $dbPass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        // 6. Şube ID belirleme (öncelik sırası)
        // a) Kullanıcının varsayılan şubesi (kullanici_yetkiler.varsayilan_sube)
        // b) Firma ayarlarındaki şube (firmaAyarlar.sube.subeId)
        // c) DB'deki ilk şube
        $subeId = $varsayilanSube;

        if ($subeId <= 0) {
            $subeAyarlar = $firmaAyarlar['sube'] ?? [];
            $subeId = (int)($subeAyarlar['subeId'] ?? 0);
        }

        if ($subeId <= 0) {
            $defSubeStmt = $pdo->prepare("SELECT id FROM subeler ORDER BY id ASC LIMIT 1");
            $defSubeStmt->execute();
            $defSubeRow = $defSubeStmt->fetch();
            $subeId = $defSubeRow ? (int)$defSubeRow['id'] : 0;
        }

        // 7. Gerçek firma ID (subeler tablosundan)
        $dbFirmaId = 0;
        if ($subeId > 0) {
            $firmaStmt = $pdo->prepare("SELECT firma_id FROM subeler WHERE id = ?");
            $firmaStmt->execute([$subeId]);
            $firmaRow = $firmaStmt->fetch();
            $dbFirmaId = $firmaRow ? (int)$firmaRow['firma_id'] : 0;
        }

        // Firma ID bulunamadıysa firmalar tablosundan al
        if ($dbFirmaId <= 0) {
            $firmaStmt2 = $pdo->prepare("SELECT id FROM firmalar LIMIT 1");
            $firmaStmt2->execute();
            $firmaRow2 = $firmaStmt2->fetch();
            $dbFirmaId = $firmaRow2 ? (int)$firmaRow2['id'] : 0;
        }

        self::$cachedContext = [
            'pdo' => $pdo,
            'firmaId' => $dbFirmaId,
            'subeId' => $subeId,
            'userId' => $userId,
            'mobilFirmaId' => $mobilFirmaId,
            'yetkiler' => $yetkiler,
            'subeYetkileri' => $subeYetkileri,
            'firmaAyarlar' => $firmaAyarlar,
            'userName' => $mobilKullanici['ad_soyad'] ?? '',
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
        ];

        return self::$cachedContext;
    }

    /**
     * Cache'i temizler (test için)
     */
    public static function reset(): void {
        self::$cachedContext = null;
    }
}
