<?php
/**
 * Orders Controller
 * Sipariş listesi ve detayları (tüm modüller için ortak)
 */

class OrdersController {
    /**
     * POST /orders/list
     * Sipariş listesi
     */
    public function getList() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $dataName = $data['dataName'] ?? '';
        $modul = $data['modul'] ?? '';
        $startDate = $data['startDate'] ?? '';
        $endDate = $data['endDate'] ?? '';
        $search = $data['search'] ?? '';
        $siparisTipi = isset($data['siparisTipi']) ? (int)$data['siparisTipi'] : 0; // 0=hepsi, 1=satış, 2=satınalma

        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $db = Database::getInstance();

            $currentUser = $db->fetchOne(
                "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
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

            // Sube bilgisi
            $subeAyarlar = $firmaAyarlar['sube'] ?? [];
            $subeId = (int)($subeAyarlar['subeId'] ?? 0);

            // Query parametreleri
            $params = [];
            $conditions = ["sm.aktif = 1"];

            $conditions[] = "sm.firma_id = :firmaId";
            $params[':firmaId'] = $firmaId;

            if ($subeId > 0) {
                $conditions[] = "sm.sube_id = :subeId";
                $params[':subeId'] = $subeId;
            }

            // Modül filtresi
            if (!empty($modul)) {
                $conditions[] = "sm.siparis_modul = :modul";
                $params[':modul'] = $modul;
            }

            // Sipariş tipi filtresi
            if ($siparisTipi > 0) {
                $conditions[] = "sm.siparis_tipi = :siparisTipi";
                $params[':siparisTipi'] = $siparisTipi;
            }

            // Tarih filtresi
            if (!empty($startDate)) {
                $conditions[] = "DATE(sm.tarih) >= :startDate";
                $params[':startDate'] = $startDate;
            }
            if (!empty($endDate)) {
                $conditions[] = "DATE(sm.tarih) <= :endDate";
                $params[':endDate'] = $endDate;
            }

            // Arama filtresi
            if (!empty($search)) {
                $conditions[] = "(c.unvan LIKE :search OR sm.siparis_kodu LIKE :search2 OR sm.musteri_siparis_kodu LIKE :search3)";
                $params[':search'] = "%{$search}%";
                $params[':search2'] = "%{$search}%";
                $params[':search3'] = "%{$search}%";
            }

            $whereClause = implode(' AND ', $conditions);

            // Ana sipariş listesi
            $sql = "
                SELECT
                    sm.id,
                    sm.siparis_kodu,
                    sm.musteri_siparis_kodu,
                    sm.siparis_tipi,
                    sm.siparis_modul,
                    sm.tarih,
                    sm.teslim_tarihi,
                    sm.doviz,
                    sm.tutar,
                    sm.miktar,
                    sm.uretim,
                    sm.aciklama,
                    sm.indirim_tipi,
                    sm.indirim_deger,
                    sm.avans_tutar,
                    sm.avans_doviz,
                    sm.musteri_sube,
                    COALESCE(c.unvan, 'Tanımsız') AS cari_adi,
                    COALESCE(s.sube_adi, '') AS sube_adi,
                    (SELECT COUNT(*) FROM siparis_detay sd WHERE sd.siparis_master_id = sm.id AND sd.aktif = 1) AS detay_sayisi,
                    (SELECT COUNT(*) FROM siparis_detay sd WHERE sd.siparis_master_id = sm.id AND sd.aktif = 1 AND sd.siparis_durum = 1) AS uretimde_sayisi
                FROM siparis_master sm
                LEFT JOIN cariler c ON c.id = sm.cariler_id
                LEFT JOIN subeler s ON s.id = sm.sube_id
                WHERE {$whereClause}
                ORDER BY sm.tarih DESC, sm.id DESC
                LIMIT 500
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            $items = [];
            $summaryByCurrency = [];
            $totalSatisSiparis = 0;
            $totalSatinalmaSiparis = 0;
            $totalUretimde = 0;
            $totalBeklemede = 0;

            foreach ($rows as $row) {
                $doviz = $row['doviz'] ?: 'TL';
                $detaySayisi = (int)$row['detay_sayisi'];
                $uretimdeCount = (int)$row['uretimde_sayisi'];
                $beklemedeSayisi = $detaySayisi - $uretimdeCount;

                // Durum hesapla
                $durum = 'beklemede'; // default
                if ((int)$row['uretim'] === 1) {
                    if ($uretimdeCount === $detaySayisi && $detaySayisi > 0) {
                        $durum = 'tamamlandi';
                    } else {
                        $durum = 'uretimde';
                    }
                }

                $items[] = [
                    'id' => (string)$row['id'],
                    'siparisKodu' => $row['siparis_kodu'] ?: '',
                    'musteriSiparisKodu' => $row['musteri_siparis_kodu'] ?: '',
                    'siparisTipi' => (int)$row['siparis_tipi'],
                    'tarih' => $row['tarih'],
                    'teslimTarihi' => $row['teslim_tarihi'],
                    'doviz' => $doviz,
                    'tutar' => (float)$row['tutar'],
                    'miktar' => (int)$row['miktar'],
                    'cariAdi' => $row['cari_adi'],
                    'subeAdi' => $row['sube_adi'],
                    'musteriSube' => $row['musteri_sube'] ?: '',
                    'aciklama' => $row['aciklama'] ?: '',
                    'uretim' => (int)$row['uretim'],
                    'durum' => $durum,
                    'detaySayisi' => $detaySayisi,
                    'uretimdeCount' => $uretimdeCount,
                    'beklemedeSayisi' => $beklemedeSayisi,
                    'indirimTipi' => (int)$row['indirim_tipi'],
                    'indirimDeger' => (float)$row['indirim_deger'],
                    'avansTutar' => (float)$row['avans_tutar'],
                    'avansDoviz' => $row['avans_doviz'] ?: '',
                ];

                // Sayaçlar
                if ((int)$row['siparis_tipi'] === 1) $totalSatisSiparis++;
                if ((int)$row['siparis_tipi'] === 2) $totalSatinalmaSiparis++;
                if ($durum === 'uretimde' || $durum === 'tamamlandi') $totalUretimde++;
                if ($durum === 'beklemede') $totalBeklemede++;

                // Döviz bazlı özet
                if (!isset($summaryByCurrency[$doviz])) {
                    $summaryByCurrency[$doviz] = [
                        'currency' => $doviz,
                        'totalCount' => 0,
                        'totalAmount' => 0,
                        'totalQuantity' => 0,
                    ];
                }
                $summaryByCurrency[$doviz]['totalCount']++;
                $summaryByCurrency[$doviz]['totalAmount'] += (float)$row['tutar'];
                $summaryByCurrency[$doviz]['totalQuantity'] += (int)$row['miktar'];
            }

            Response::success([
                'items' => $items,
                'count' => count($items),
                'summary' => array_values($summaryByCurrency),
                'stats' => [
                    'totalSatis' => $totalSatisSiparis,
                    'totalSatinalma' => $totalSatinalmaSiparis,
                    'totalUretimde' => $totalUretimde,
                    'totalBeklemede' => $totalBeklemede,
                ],
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /orders/detail
     * Sipariş detayları (satırlar)
     */
    public function getDetail() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $dataName = $data['dataName'] ?? '';
        $siparisId = $data['siparisId'] ?? '';

        if (empty($dataName) || empty($siparisId)) {
            Response::error('dataName ve siparisId gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $db = Database::getInstance();

            $currentUser = $db->fetchOne(
                "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
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

            // Sipariş detay satırları
            $sql = "
                SELECT
                    sd.id,
                    sd.siparis_master_id,
                    sd.barkod_tipi,
                    sd.stok_master_id,
                    sd.model_id,
                    sd.hammadde_grubu,
                    sd.fiyat,
                    sd.indirim,
                    sd.indirim_tip,
                    sd.doviz,
                    sd.dovizli_fiyat,
                    sd.kdv_oran,
                    sd.satis_fiyat,
                    sd.maliyet_fiyat,
                    sd.beden_set_id,
                    sd.b1, sd.b2, sd.b3, sd.b4, sd.b5, sd.b6,
                    sd.b7, sd.b8, sd.b9, sd.b10, sd.b11, sd.b12,
                    sd.miktar,
                    sd.aciklama,
                    sd.siparis_durum,
                    sd.uretim_tipi,
                    COALESCE(mk.model_adi, '') AS model_adi,
                    COALESCE(mk.model_kodu, '') AS model_kodu,
                    COALESCE(sm_stok.stok_adi, '') AS stok_adi,
                    COALESCE(sm_stok.stok_kodu, '') AS stok_kodu,
                    COALESCE(bs.set_adi, '') AS beden_set_adi
                FROM siparis_detay sd
                LEFT JOIN model_kartlar mk ON mk.id = sd.model_id
                LEFT JOIN stok_master sm_stok ON sm_stok.id = sd.stok_master_id
                LEFT JOIN beden_setleri bs ON bs.id = sd.beden_set_id
                WHERE sd.siparis_master_id = :siparisId AND sd.aktif = 1
                ORDER BY sd.id ASC
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([':siparisId' => $siparisId]);
            $rows = $stmt->fetchAll();

            // Beden set adlarını çek
            $bedenSetIds = array_unique(array_filter(array_column($rows, 'beden_set_id')));
            $bedenAdlari = [];
            if (!empty($bedenSetIds)) {
                $placeholders = implode(',', array_fill(0, count($bedenSetIds), '?'));
                $bedenSql = "SELECT id, b1_adi, b2_adi, b3_adi, b4_adi, b5_adi, b6_adi, b7_adi, b8_adi, b9_adi, b10_adi, b11_adi, b12_adi FROM beden_setleri WHERE id IN ($placeholders)";
                $bedenStmt = $pdo->prepare($bedenSql);
                $bedenStmt->execute(array_values($bedenSetIds));
                foreach ($bedenStmt->fetchAll() as $bs) {
                    $bedenAdlari[(int)$bs['id']] = $bs;
                }
            }

            $details = [];
            foreach ($rows as $row) {
                $bedenSetId = (int)$row['beden_set_id'];
                $bedenler = [];
                if ($bedenSetId > 0 && isset($bedenAdlari[$bedenSetId])) {
                    $bsData = $bedenAdlari[$bedenSetId];
                    for ($i = 1; $i <= 12; $i++) {
                        $bedenAdi = $bsData["b{$i}_adi"] ?? '';
                        $bedenMiktar = (int)($row["b{$i}"] ?? 0);
                        if (!empty($bedenAdi) && $bedenMiktar > 0) {
                            $bedenler[] = [
                                'beden' => $bedenAdi,
                                'miktar' => $bedenMiktar,
                            ];
                        }
                    }
                }

                $durumLabel = 'Beklemede';
                if ((int)$row['siparis_durum'] === 1) $durumLabel = 'Üretimde';

                $uretimTipiLabel = 'Üretim';
                switch ((int)$row['uretim_tipi']) {
                    case 1: $uretimTipiLabel = 'Stoktan'; break;
                    case 2: $uretimTipiLabel = 'Tedarik'; break;
                }

                $details[] = [
                    'id' => (string)$row['id'],
                    'modelAdi' => $row['model_adi'],
                    'modelKodu' => $row['model_kodu'],
                    'stokAdi' => $row['stok_adi'],
                    'stokKodu' => $row['stok_kodu'],
                    'hammaddeGrubu' => $row['hammadde_grubu'] ?: '',
                    'fiyat' => (float)$row['fiyat'],
                    'doviz' => $row['doviz'] ?: 'TL',
                    'miktar' => (float)$row['miktar'],
                    'kdvOran' => (float)$row['kdv_oran'],
                    'siparisDurum' => (int)$row['siparis_durum'],
                    'durumLabel' => $durumLabel,
                    'uretimTipi' => (int)$row['uretim_tipi'],
                    'uretimTipiLabel' => $uretimTipiLabel,
                    'bedenSetAdi' => $row['beden_set_adi'],
                    'bedenler' => $bedenler,
                    'aciklama' => $row['aciklama'] ?: '',
                ];
            }

            Response::success([
                'details' => $details,
                'count' => count($details),
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }
}
