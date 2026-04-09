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
