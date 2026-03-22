<?php
/**
 * Doviz Controller
 * Döviz kurları ve çevrim işlemleri
 */

class DovizController {

    /**
     * Ortak: Auth + firma DB bağlantısı
     */
    private function getContext() {
        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $db = Database::getInstance();

        $currentUser = $db->fetchOne(
            "SELECT mobil_firmalar_id, kullanici_yetkiler FROM mobil_kullanici WHERE id = ?",
            [$userId]
        );

        if (!$currentUser || !$currentUser['mobil_firmalar_id']) {
            Response::error('Kullanıcı firma bilgisi bulunamadı', 'USER_FIRMA_NOT_FOUND', 404);
        }

        $firmaId = $currentUser['mobil_firmalar_id'];

        $firma = $db->fetchOne(
            "SELECT firma_ayarlar FROM mobil_firmalar WHERE id = ?",
            [$firmaId]
        );

        if (!$firma || empty($firma['firma_ayarlar'])) {
            Response::error('Firma ayarları bulunamadı', 'FIRMA_SETTINGS_NOT_FOUND', 404);
        }

        $firmaAyarlar = json_decode($firma['firma_ayarlar'], true) ?: [];
        $veritabani = $firmaAyarlar['veritabani'] ?? [];
        $dbServer = $veritabani['sunucu'] ?? '';
        $dbPort = (int)($veritabani['port'] ?? 3306);
        $dbUser = $veritabani['kullanici'] ?? '';
        $dbPass = $veritabani['sifre'] ?? '';
        $dbName = $veritabani['veriAdi'] ?? '';

        if (empty($dbServer) || empty($dbUser) || empty($dbName)) {
            Response::error('Firma veritabanı ayarları eksik', 'DB_CONFIG_MISSING', 400);
        }

        $dsn = "mysql:host={$dbServer};port={$dbPort};dbname={$dbName};charset=utf8mb4";
        $pdo = new PDO($dsn, $dbUser, $dbPass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);

        return [
            'userId' => $userId,
            'firmaId' => $firmaId,
            'pdo' => $pdo,
        ];
    }

    /**
     * POST /doviz/kurlar
     * Belirli tarih için döviz kurlarını getir
     * Body: { tarih?: "2026-03-14", kurAnahtar?: "tr" }
     */
    public function getKurlar() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $tarih = $data['tarih'] ?? date('Y-m-d');
        $kurAnahtar = $data['kurAnahtar'] ?? 'tr';

        try {
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];
            $firmaId = $ctx['firmaId'];

            // Önce firma_kurlari tablosundan kontrol et
            $stmt = $pdo->prepare("
                SELECT doviz_tipi, doviz_alis, doviz_satis, efektif_alis, efektif_satis, ozel_kur
                FROM firma_kurlari
                WHERE firma_id = :firmaId AND tarih = :tarih AND kur_anahtar = :kurAnahtar
            ");
            $stmt->execute([':firmaId' => $firmaId, ':tarih' => $tarih, ':kurAnahtar' => $kurAnahtar]);
            $firmaKurlari = $stmt->fetchAll();

            // Firma kurları varsa onları kullan
            if (!empty($firmaKurlari)) {
                $kurlar = [];
                foreach ($firmaKurlari as $row) {
                    $kurlar[$row['doviz_tipi']] = [
                        'dovizTipi' => $row['doviz_tipi'],
                        'dovizAlis' => (float)$row['doviz_alis'],
                        'dovizSatis' => (float)$row['doviz_satis'],
                        'efektifAlis' => (float)$row['efektif_alis'],
                        'efektifSatis' => (float)$row['efektif_satis'],
                        'ozelKur' => (float)$row['ozel_kur'],
                    ];
                }

                Response::success([
                    'tarih' => $tarih,
                    'kurAnahtar' => $kurAnahtar,
                    'kaynak' => 'firma',
                    'kurlar' => $kurlar,
                ]);
                return;
            }

            // Firma kurları yoksa genel doviz_kurlari tablosundan çek
            // Önce istenen tarihe bak, yoksa en son tarihi bul
            $stmt = $pdo->prepare("
                SELECT doviz_tipi, doviz_alis, doviz_satis, efektif_alis, efektif_satis, ozel_kur, tarih
                FROM doviz_kurlari
                WHERE tarih <= :tarih AND kur_anahtar = :kurAnahtar
                ORDER BY tarih DESC
                LIMIT 20
            ");
            $stmt->execute([':tarih' => $tarih, ':kurAnahtar' => $kurAnahtar]);
            $rows = $stmt->fetchAll();

            if (empty($rows)) {
                Response::success([
                    'tarih' => $tarih,
                    'kurAnahtar' => $kurAnahtar,
                    'kaynak' => 'genel',
                    'kurlar' => (object)[],
                ]);
                return;
            }

            // İlk satırın tarihi en güncel tarih
            $enGuncelTarih = $rows[0]['tarih'];
            $kurlar = [];
            foreach ($rows as $row) {
                if ($row['tarih'] !== $enGuncelTarih) break;
                $kurlar[$row['doviz_tipi']] = [
                    'dovizTipi' => $row['doviz_tipi'],
                    'dovizAlis' => (float)$row['doviz_alis'],
                    'dovizSatis' => (float)$row['doviz_satis'],
                    'efektifAlis' => (float)$row['efektif_alis'],
                    'efektifSatis' => (float)$row['efektif_satis'],
                    'ozelKur' => (float)$row['ozel_kur'],
                ];
            }

            Response::success([
                'tarih' => $enGuncelTarih,
                'kurAnahtar' => $kurAnahtar,
                'kaynak' => 'genel',
                'kurlar' => $kurlar,
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }
}
