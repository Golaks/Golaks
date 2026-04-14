<?php
/**
 * Doviz Controller
 * Döviz kurları ve çevrim işlemleri
 */

class DovizController {

    /**
     * Ortak: Auth + firma DB bağlantısı
     */
    private function getContext(): array {
        require_once __DIR__ . '/../includes/ContextHelper.php';
        return ContextHelper::get();
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

            // En güncel tarihi bul (istenen tarih veya öncesi)
            $tarihStmt = $pdo->prepare("
                SELECT MAX(tarih) AS son_tarih FROM doviz_kurlari
                WHERE tarih <= :tarih AND kur_anahtar = :kurAnahtar
            ");
            $tarihStmt->execute([':tarih' => $tarih, ':kurAnahtar' => $kurAnahtar]);
            $sonTarihRow = $tarihStmt->fetch();
            $sonTarih = $sonTarihRow && $sonTarihRow['son_tarih'] ? $sonTarihRow['son_tarih'] : $tarih;

            // O tarihteki tüm kurları çek
            $stmt = $pdo->prepare("
                SELECT doviz_tipi, doviz_alis, doviz_satis, efektif_alis, efektif_satis, ozel_kur
                FROM doviz_kurlari
                WHERE tarih = :tarih AND kur_anahtar = :kurAnahtar
            ");
            $stmt->execute([':tarih' => $sonTarih, ':kurAnahtar' => $kurAnahtar]);
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

            $kurlar = [];
            foreach ($rows as $row) {
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
                'tarih' => $sonTarih,
                'kurAnahtar' => $kurAnahtar,
                'kurlar' => $kurlar,
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }
}
