<?php
/**
 * Fis Controller
 * Muhasebe fiş işlemleri
 */

class FisController {

    private function getContext(): array {
        require_once __DIR__ . '/../includes/ContextHelper.php';
        return ContextHelper::get();
    }

    /**
     * POST /fis/list
     * Fiş listesi (detaylarıyla birlikte)
     */
    public function getList() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];

            $startDate = $data['startDate'] ?? '';
            $endDate = $data['endDate'] ?? '';

            $params = [];
            $conditions = ["fm.aktif != -1"];

            // Firma filtresi
            $conditions[] = "fm.firma_id = :firmaId";
            $params[':firmaId'] = $ctx['firmaId'];

            // Tarih filtresi
            if (!empty($startDate)) {
                $conditions[] = "DATE(fm.fis_tarihi) >= :startDate";
                $params[':startDate'] = $startDate;
            }
            if (!empty($endDate)) {
                $conditions[] = "DATE(fm.fis_tarihi) <= :endDate";
                $params[':endDate'] = $endDate;
            }

            $whereClause = implode(' AND ', $conditions);

            $sql = "
                SELECT
                    fm.id,
                    fm.fis_no,
                    fm.fis_tipi,
                    fm.fis_tarihi,
                    fm.fis_aciklama,
                    fm.kasa_hesap_kodu,
                    fm.kasa_durum,
                    fm.kayit_id,
                    fm.kayit_tablo,
                    fm.aktif,
                    (SELECT COUNT(*) FROM fis_detay fd WHERE fd.fis_master_id = fm.id AND fd.aktif = 1) AS detay_sayisi,
                    (SELECT COALESCE(SUM(fd2.borc), 0) FROM fis_detay fd2 WHERE fd2.fis_master_id = fm.id AND fd2.aktif = 1) AS toplam_borc,
                    (SELECT COALESCE(SUM(fd2.alacak), 0) FROM fis_detay fd2 WHERE fd2.fis_master_id = fm.id AND fd2.aktif = 1) AS toplam_alacak
                FROM fis_master fm
                WHERE {$whereClause}
                ORDER BY fm.fis_tarihi DESC, fm.id DESC
                LIMIT 500
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            $items = [];
            foreach ($rows as $row) {
                // Detay satırlarını al
                $detayStmt = $pdo->prepare("
                    SELECT
                        fd.id,
                        fd.hesap_kodu,
                        fd.aciklama,
                        fd.borc,
                        fd.alacak,
                        fd.doviz,
                        fd.doviz_kuru,
                        fd.dovizli_borc,
                        fd.dovizli_alacak,
                        fd.cari_borc,
                        fd.cari_alacak,
                        fd.cari_doviz,
                        fd.random
                    FROM fis_detay fd
                    WHERE fd.fis_master_id = ? AND fd.aktif = 1
                    ORDER BY fd.id ASC
                ");
                $detayStmt->execute([$row['id']]);
                $detaylar = [];
                foreach ($detayStmt->fetchAll() as $det) {
                    $detaylar[] = [
                        'id' => (int)$det['id'],
                        'hesapKodu' => $det['hesap_kodu'],
                        'aciklama' => $det['aciklama'] ?? '',
                        'borc' => (float)$det['borc'],
                        'alacak' => (float)$det['alacak'],
                        'doviz' => $det['doviz'],
                        'dovizKuru' => (float)$det['doviz_kuru'],
                        'dovizliBorc' => (float)$det['dovizli_borc'],
                        'dovizliAlacak' => (float)$det['dovizli_alacak'],
                        'cariBorc' => (float)$det['cari_borc'],
                        'cariAlacak' => (float)$det['cari_alacak'],
                        'cariDoviz' => $det['cari_doviz'],
                        'random' => $det['random'],
                    ];
                }

                $items[] = [
                    'id' => (int)$row['id'],
                    'fisNo' => $row['fis_no'],
                    'fisTipi' => $row['fis_tipi'],
                    'fisTarihi' => $row['fis_tarihi'],
                    'fisAciklama' => $row['fis_aciklama'] ?? '',
                    'kasaHesapKodu' => $row['kasa_hesap_kodu'],
                    'kasaDurum' => (int)$row['kasa_durum'],
                    'kayitId' => (int)$row['kayit_id'],
                    'kayitTablo' => $row['kayit_tablo'],
                    'aktif' => (int)$row['aktif'],
                    'detaySayisi' => (int)$row['detay_sayisi'],
                    'toplamBorc' => (float)$row['toplam_borc'],
                    'toplamAlacak' => (float)$row['toplam_alacak'],
                    'detaylar' => $detaylar,
                ];
            }

            Response::success([
                'items' => $items,
                'count' => count($items),
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /fis/next-no
     * Sıradaki fiş numarasını getirir
     */
    public function getNextNo() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        try {
            $ctx = $this->getContext();
            require_once __DIR__ . '/../includes/FisService.php';
            $fisService = new FisService($ctx['pdo'], $ctx['firmaId'], $ctx['subeId'], $ctx['userId']);
            $fisNo = $fisService->getNextFisNo();

            Response::success(['fisNo' => $fisNo]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /fis/create
     * Yeni fiş oluşturur (master + detaylar)
     */
    public function create() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            $ctx = $this->getContext();

            require_once __DIR__ . '/../includes/FisService.php';
            $fisService = new FisService($ctx['pdo'], $ctx['firmaId'], $ctx['subeId'], $ctx['userId']);

            // Master oluştur
            $masterResult = $fisService->createFisMaster([
                'fisTipi' => $data['fisTipi'] ?? 'Mahsup',
                'fisTarihi' => $data['fisTarihi'] ?? date('Y-m-d H:i:s'),
                'fisAciklama' => $data['fisAciklama'] ?? '',
                'kayitId' => 0,
                'kayitTablo' => 'diger',
                'kasaDurum' => (int)($data['kasaDurum'] ?? 1),
                'fisNo' => $data['fisNo'] ?? null,
            ]);

            $fisMasterId = $masterResult['id'];

            // Şube varsayılan dövizi
            $subeStmt = $ctx['pdo']->prepare("SELECT varsayilan_doviz FROM subeler WHERE id = ?");
            $subeStmt->execute([$ctx['subeId']]);
            $subeRow = $subeStmt->fetch();
            $subeDoviz = ($subeRow && !empty($subeRow['varsayilan_doviz'])) ? $subeRow['varsayilan_doviz'] : 'TL';

            // Detay satırları
            $detaylar = $data['detaylar'] ?? [];
            $detayIds = [];
            foreach ($detaylar as $det) {
                $borc = (float)($det['borc'] ?? 0);
                $alacak = (float)($det['alacak'] ?? 0);
                $doviz = !empty($det['doviz']) ? $det['doviz'] : $subeDoviz;

                // Hesap kodundan cari dövizini bul
                $cariDoviz = $doviz;
                $hesapKodu = $det['hesapKodu'] ?? '';
                if (!empty($hesapKodu)) {
                    $cariStmt = $ctx['pdo']->prepare("SELECT doviz FROM cariler WHERE hesap_kodu = ? AND firma_id = ? AND aktif = 1 LIMIT 1");
                    $cariStmt->execute([$hesapKodu, $ctx['firmaId']]);
                    $cariRow = $cariStmt->fetch();
                    if ($cariRow && !empty($cariRow['doviz'])) {
                        $cariDoviz = $cariRow['doviz'];
                    }
                }

                $random = bin2hex(random_bytes(16));

                $detayId = $fisService->addFisDetay($fisMasterId, [
                    'hesapKodu' => $hesapKodu,
                    'aciklama' => $det['aciklama'] ?? '',
                    'borc' => (float)($det['borc'] ?? 0),
                    'alacak' => (float)($det['alacak'] ?? 0),
                    'doviz' => !empty($det['doviz']) ? $det['doviz'] : $subeDoviz,
                    'dovizKuru' => (float)($det['dovizKuru'] ?? 1),
                    'dovizliBorc' => (float)($det['dovizliBorc'] ?? $borc),
                    'dovizliAlacak' => (float)($det['dovizliAlacak'] ?? $alacak),
                    'dovizliDoviz' => !empty($det['dovizliDoviz']) ? $det['dovizliDoviz'] : $doviz,
                    'dovizliKur' => (float)($det['dovizliKur'] ?? 1),
                    'cariBorc' => (float)($det['cariBorc'] ?? $borc),
                    'cariAlacak' => (float)($det['cariAlacak'] ?? $alacak),
                    'cariDoviz' => !empty($det['cariDoviz']) ? $det['cariDoviz'] : $cariDoviz,
                    'cariKur' => (float)($det['cariKur'] ?? 1),
                    'random' => $random,
                ]);
                $detayIds[] = $detayId;
            }

            Response::success([
                'message' => 'Fiş oluşturuldu',
                'id' => $fisMasterId,
                'fisNo' => $masterResult['fisNo'],
                'detayIds' => $detayIds,
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /fis/update
     * Fiş günceller
     */
    public function update() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            $ctx = $this->getContext();

            $fisId = (int)($data['id'] ?? 0);
            if ($fisId <= 0) {
                Response::error('Fiş ID gereklidir', 'VALIDATION_ERROR', 400);
            }

            require_once __DIR__ . '/../includes/FisService.php';
            require_once __DIR__ . '/../includes/LogService.php';

            $fisService = new FisService($ctx['pdo'], $ctx['firmaId'], $ctx['subeId'], $ctx['userId']);
            $logService = new LogService($ctx['pdo'], $ctx['firmaId'], $ctx['subeId'], $ctx['userId']);

            // Eski veriyi al
            $eskiFis = $fisService->getFisMaster($fisId);
            if (!$eskiFis) {
                Response::error('Fiş bulunamadı', 'NOT_FOUND', 404);
            }

            // Master güncelle
            $fisService->updateFisMaster($fisId, [
                'fisTipi' => $data['fisTipi'] ?? $eskiFis['fisTipi'],
                'fisTarihi' => $data['fisTarihi'] ?? $eskiFis['fisTarihi'],
                'fisAciklama' => $data['fisAciklama'] ?? $eskiFis['fisAciklama'],
                'kasaDurum' => (int)($data['kasaDurum'] ?? $eskiFis['kasaDurum']),
            ]);

            // Eski detayları sil
            $fisService->deleteFisDetayByMaster($fisId);

            // Şube varsayılan dövizi
            $subeStmt = $ctx['pdo']->prepare("SELECT varsayilan_doviz FROM subeler WHERE id = ?");
            $subeStmt->execute([$ctx['subeId']]);
            $subeRow = $subeStmt->fetch();
            $subeDoviz = ($subeRow && !empty($subeRow['varsayilan_doviz'])) ? $subeRow['varsayilan_doviz'] : 'TL';

            // Yeni detayları ekle
            $detaylar = $data['detaylar'] ?? [];
            foreach ($detaylar as $det) {
                $borc = (float)($det['borc'] ?? 0);
                $alacak = (float)($det['alacak'] ?? 0);
                $doviz = !empty($det['doviz']) ? $det['doviz'] : $subeDoviz;

                $cariDoviz = $doviz;
                $hesapKodu = $det['hesapKodu'] ?? '';
                if (!empty($hesapKodu)) {
                    $cariStmt = $ctx['pdo']->prepare("SELECT doviz FROM cariler WHERE hesap_kodu = ? AND firma_id = ? AND aktif = 1 LIMIT 1");
                    $cariStmt->execute([$hesapKodu, $ctx['firmaId']]);
                    $cariRow = $cariStmt->fetch();
                    if ($cariRow && !empty($cariRow['doviz'])) {
                        $cariDoviz = $cariRow['doviz'];
                    }
                }

                $fisService->addFisDetay($fisId, [
                    'hesapKodu' => $hesapKodu,
                    'aciklama' => $det['aciklama'] ?? '',
                    'borc' => (float)($det['borc'] ?? 0),
                    'alacak' => (float)($det['alacak'] ?? 0),
                    'doviz' => !empty($det['doviz']) ? $det['doviz'] : $subeDoviz,
                    'dovizKuru' => (float)($det['dovizKuru'] ?? 1),
                    'dovizliBorc' => (float)($det['dovizliBorc'] ?? $borc),
                    'dovizliAlacak' => (float)($det['dovizliAlacak'] ?? $alacak),
                    'dovizliDoviz' => !empty($det['dovizliDoviz']) ? $det['dovizliDoviz'] : $doviz,
                    'dovizliKur' => (float)($det['dovizliKur'] ?? 1),
                    'cariBorc' => (float)($det['cariBorc'] ?? $borc),
                    'cariAlacak' => (float)($det['cariAlacak'] ?? $alacak),
                    'cariDoviz' => !empty($det['cariDoviz']) ? $det['cariDoviz'] : $cariDoviz,
                    'cariKur' => (float)($det['cariKur'] ?? 1),
                    'random' => bin2hex(random_bytes(16)),
                ]);
            }

            // Log
            $yeniFis = $fisService->getFisMaster($fisId);
            $logService->duzenle('fis_master', $fisId, $eskiFis, $yeniFis, 'Fiş güncellendi');

            Response::success([
                'message' => 'Fiş güncellendi',
                'id' => $fisId,
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /fis/onayla
     * Fişi onaylar (kasa_durum = 0 yapar)
     */
    public function onayla() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            $ctx = $this->getContext();

            $fisId = (int)($data['id'] ?? 0);
            if ($fisId <= 0) {
                Response::error('Fiş ID gereklidir', 'VALIDATION_ERROR', 400);
            }

            require_once __DIR__ . '/../includes/FisService.php';
            $fisService = new FisService($ctx['pdo'], $ctx['firmaId'], $ctx['subeId'], $ctx['userId']);

            // Detay sayısı kontrolü
            $sayiStmt = $ctx['pdo']->prepare("SELECT COUNT(*) AS sayi FROM fis_detay WHERE fis_master_id = ? AND aktif = 1");
            $sayiStmt->execute([$fisId]);
            $sayiRow = $sayiStmt->fetch();
            if ((int)$sayiRow['sayi'] === 0) {
                Response::error('Fişte hiç satır yok. Onaylamak için en az bir satır ekleyin.', 'NO_DETAIL', 400);
            }

            // Borç-Alacak denge kontrolü
            $dengeStmt = $ctx['pdo']->prepare("
                SELECT
                    COALESCE(SUM(borc), 0) AS toplam_borc,
                    COALESCE(SUM(alacak), 0) AS toplam_alacak
                FROM fis_detay
                WHERE fis_master_id = ? AND aktif = 1
            ");
            $dengeStmt->execute([$fisId]);
            $denge = $dengeStmt->fetch();
            $fark = abs((float)$denge['toplam_borc'] - (float)$denge['toplam_alacak']);

            if ($fark > 0.01) {
                Response::error(
                    'Fiş dengede değil. Borç: ' . number_format((float)$denge['toplam_borc'], 2, ',', '.') .
                    ' Alacak: ' . number_format((float)$denge['toplam_alacak'], 2, ',', '.') .
                    ' Fark: ' . number_format($fark, 2, ',', '.'),
                    'BALANCE_ERROR', 400
                );
            }

            $fisService->updateFisMaster($fisId, ['kasaDurum' => 0]);

            Response::success([
                'message' => 'Fiş onaylandı',
                'id' => $fisId,
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }
}
