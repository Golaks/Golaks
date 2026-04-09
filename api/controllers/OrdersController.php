<?php
/**
 * Orders Controller
 * Sipariş listesi ve detayları (tüm modüller için ortak)
 */

class OrdersController {

    /**
     * Ortak: Auth + firma DB bağlantısı
     */
    private function getContext(): array {
        require_once __DIR__ . '/../includes/ContextHelper.php';
        return ContextHelper::get();
    }

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
            $conditions = ["1=1"];

            $conditions[] = "sm.firma_id = :firmaId";
            $params[':firmaId'] = $firmaId;

            if ($subeId > 0) {
                $conditions[] = "sm.sube_id = :subeId";
                $params[':subeId'] = $subeId;
            }

            // Silinmiş kayıtları hariç tut (aktif = -1)
            $conditions[] = "sm.aktif != -1";

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
                    sm.aktif,
                    sm.durum_bilgi,
                    sm.aciklama,
                    sm.master_avans_indirim,
                    sm.musteri_sube,
                    sm.cariler_id,
                    sm.teslim_sekli_id,
                    sm.paketleme_id,
                    sm.deri_grubu,
                    sm.siparisi_alan,
                    sm.siparis_grubu_id,
                    sm.siparis_tipi_id,
                    sm.kayit_kullanici_id,
                    COALESCE(c.unvan, 'Tanımsız') AS cari_adi,
                    COALESCE(s.sube_adi, '') AS sube_adi,
                    COALESCE(ts.tanim_deger, '') AS teslim_sekli_adi,
                    COALESCE(pk.tanim_deger, '') AS paketleme_adi,
                    COALESCE(sg.tanim_deger, '') AS siparis_grubu_adi,
                    COALESCE(st.tanim_deger, '') AS siparis_tipi_adi,
                    (SELECT COUNT(*) FROM siparis_detay sd WHERE sd.siparis_master_id = sm.id AND sd.aktif = 1) AS detay_sayisi,
                    (SELECT COUNT(*) FROM siparis_detay sd WHERE sd.siparis_master_id = sm.id AND sd.aktif = 1 AND sd.siparis_durum = 1) AS uretimde_sayisi
                FROM siparis_master sm
                LEFT JOIN cariler c ON c.id = sm.cariler_id
                LEFT JOIN subeler s ON s.id = sm.sube_id
                LEFT JOIN tanimlar ts ON ts.id = sm.teslim_sekli_id
                LEFT JOIN tanimlar pk ON pk.id = sm.paketleme_id
                LEFT JOIN tanimlar sg ON sg.id = sm.siparis_grubu_id
                LEFT JOIN tanimlar st ON st.id = sm.siparis_tipi_id
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
            $totalKapali = 0;
            $totalIptal = 0;

            foreach ($rows as $row) {
                $doviz = $row['doviz'] ?: 'TL';
                $detaySayisi = (int)$row['detay_sayisi'];
                $uretimdeCount = (int)$row['uretimde_sayisi'];
                $beklemedeSayisi = $detaySayisi - $uretimdeCount;
                $durumBilgi = $row['durum_bilgi'] ? json_decode($row['durum_bilgi'], true) : null;
                $aktif = (int)$row['aktif'];

                // Durum hesapla: aktif durumuna göre
                $durum = 'beklemede'; // default
                $uretim = 0;
                if ($aktif === -2) {
                    $durum = 'iptal';
                } elseif ($aktif === 0) {
                    $durum = 'kapali';
                } elseif ($durumBilgi && !empty($durumBilgi['uretimOnay'])) {
                    $durum = 'uretimde';
                    $uretim = 1;
                }

                $items[] = [
                    'id' => (string)$row['id'],
                    'siparisKodu' => $row['siparis_kodu'] ?: '',
                    'musteriSiparisKodu' => $row['musteri_siparis_kodu'] ?: '',
                    'siparisTipi' => (int)$row['siparis_tipi'],
                    'siparisModul' => $row['siparis_modul'] ?: '',
                    'tarih' => $row['tarih'],
                    'teslimTarihi' => $row['teslim_tarihi'],
                    'doviz' => $doviz,
                    'tutar' => (float)$row['tutar'],
                    'miktar' => (int)$row['miktar'],
                    'cariAdi' => $row['cari_adi'],
                    'subeAdi' => $row['sube_adi'],
                    'musteriSube' => $row['musteri_sube'] ?: '',
                    'aciklama' => $row['aciklama'] ?: '',
                    'aktif' => $aktif,
                    'uretim' => $uretim,
                    'durum' => $durum,
                    'durumBilgi' => $durumBilgi,
                    'detaySayisi' => $detaySayisi,
                    'uretimdeCount' => $uretimdeCount,
                    'beklemedeSayisi' => $beklemedeSayisi,
                    'masterAvansIndirim' => $row['master_avans_indirim'] ? json_decode($row['master_avans_indirim'], true) : null,
                    'carilerId' => (int)$row['cariler_id'],
                    'teslimSekliId' => (int)$row['teslim_sekli_id'],
                    'paketlemeId' => (int)$row['paketleme_id'],
                    'deriGrubu' => $row['deri_grubu'] ?: '',
                    'siparisiAlan' => $row['siparisi_alan'] ?: '',
                    'siparisGrubuId' => (int)($row['siparis_grubu_id'] ?? 0),
                    'siparisTipiId' => (int)($row['siparis_tipi_id'] ?? 0),
                    'siparisGrubuAdi' => $row['siparis_grubu_adi'] ?: '',
                    'siparisTipiAdi' => $row['siparis_tipi_adi'] ?: '',
                    'teslimSekliAdi' => $row['teslim_sekli_adi'] ?: '',
                    'paketlemeAdi' => $row['paketleme_adi'] ?: '',
                    'kayitKullaniciId' => (int)($row['kayit_kullanici_id'] ?? 0),
                    'kayitTarihi' => $row['kayit_tarihi'] ?? '',
                ];

                // Sayaçlar
                if ((int)$row['siparis_tipi'] === 1) $totalSatisSiparis++;
                if ((int)$row['siparis_tipi'] === 2) $totalSatinalmaSiparis++;
                if ($durum === 'uretimde') $totalUretimde++;
                if ($durum === 'beklemede') $totalBeklemede++;
                if ($durum === 'kapali') $totalKapali++;
                if ($durum === 'iptal') $totalIptal++;

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
                    'totalKapali' => $totalKapali,
                    'totalIptal' => $totalIptal,
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
                    sd.stok_varyant_id,
                    COALESCE(mk.model_adi, '') AS model_adi,
                    COALESCE(sm_stok.stok_adi, '') AS stok_adi,
                    COALESCE(sm_stok.stok_kodu, '') AS stok_kodu,
                    COALESCE(sv.varyant_adi, '') AS varyant_adi,
                    COALESCE(sv.varyant_kodu, '') AS varyant_kodu,
                    COALESCE(sv.barkod, '') AS varyant_barkod,
                    COALESCE(sv.stok_grup_kodu, '') AS stok_grup_kodu
                FROM siparis_detay sd
                LEFT JOIN model_kartlar mk ON mk.id = sd.model_id
                LEFT JOIN stok_master sm_stok ON sm_stok.id = sd.stok_master_id
                LEFT JOIN stok_varyant sv ON sv.id = sd.stok_varyant_id
                WHERE sd.siparis_master_id = :siparisId AND sd.aktif = 1
                ORDER BY sd.id ASC
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([':siparisId' => $siparisId]);
            $rows = $stmt->fetchAll();

            // Model resimlerini çek (her model için ilk resim)
            $modelIds = array_unique(array_filter(array_column($rows, 'model_id')));
            $modelResimleri = [];
            if (!empty($modelIds)) {
                $placeholders = implode(',', array_fill(0, count($modelIds), '?'));
                $resimSql = "
                    SELECT modul_kayit_id, dosya_yolu
                    FROM dosyalar
                    WHERE modul = 'model_kartlar'
                      AND modul_kayit_id IN ($placeholders)
                      AND aktif = 1
                      AND dosya_tipi IN ('jpg', 'jpeg', 'png', 'webp')
                    ORDER BY id ASC
                ";
                $resimStmt = $pdo->prepare($resimSql);
                $resimStmt->execute(array_values($modelIds));
                foreach ($resimStmt->fetchAll() as $r) {
                    $mid = (int)$r['modul_kayit_id'];
                    if (!isset($modelResimleri[$mid])) {
                        $modelResimleri[$mid] = $r['dosya_yolu'];
                    }
                }
            }

            // Beden set adlarını çek
            $bedenSetIds = array_unique(array_filter(array_column($rows, 'beden_set_id')));
            $bedenSetleri = [];
            if (!empty($bedenSetIds)) {
                $placeholders = implode(',', array_fill(0, count($bedenSetIds), '?'));
                $bedenSql = "SELECT id, set_tipi, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12 FROM beden_setleri WHERE id IN ($placeholders)";
                $bedenStmt = $pdo->prepare($bedenSql);
                $bedenStmt->execute(array_values($bedenSetIds));
                foreach ($bedenStmt->fetchAll() as $bs) {
                    $bedenSetleri[(int)$bs['id']] = $bs;
                }
            }

            $details = [];
            foreach ($rows as $row) {
                $bedenSetId = (int)$row['beden_set_id'];
                $bedenler = [];
                $bedenSetAdi = '';
                if ($bedenSetId > 0 && isset($bedenSetleri[$bedenSetId])) {
                    $bsData = $bedenSetleri[$bedenSetId];
                    $bedenSetAdi = $bsData['set_tipi'] ?? '';
                    for ($i = 1; $i <= 12; $i++) {
                        $bedenAdi = $bsData["b{$i}"] ?? '';
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
                    'modelKodu' => '',
                    'stokAdi' => $row['stok_adi'],
                    'stokKodu' => $row['stok_kodu'],
                    'hammaddeGrubu' => $row['hammadde_grubu'] ?: '',
                    'varyantAdi' => $row['varyant_adi'],
                    'varyantKodu' => $row['varyant_kodu'],
                    'varyantBarkod' => $row['varyant_barkod'],
                    'stokGrupKodu' => $row['stok_grup_kodu'],
                    'fiyat' => (float)$row['fiyat'],
                    'doviz' => $row['doviz'] ?: 'TL',
                    'miktar' => (float)$row['miktar'],
                    'kdvOran' => (float)$row['kdv_oran'],
                    'siparisDurum' => (int)$row['siparis_durum'],
                    'durumLabel' => $durumLabel,
                    'uretimTipi' => (int)$row['uretim_tipi'],
                    'uretimTipiLabel' => $uretimTipiLabel,
                    'bedenSetAdi' => $bedenSetAdi,
                    'bedenler' => $bedenler,
                    'aciklama' => $row['aciklama'] ?: '',
                    'indirim' => (float)$row['indirim'],
                    'indirimTip' => (int)$row['indirim_tip'],
                    'dovizliFiyat' => (float)$row['dovizli_fiyat'],
                    'satisFiyat' => (float)$row['satis_fiyat'],
                    'maliyetFiyat' => (float)$row['maliyet_fiyat'],
                    'resimUrl' => $modelResimleri[(int)$row['model_id']] ?? '',
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

    /**
     * POST /orders/recete
     * Sipariş reçetesi
     */
    public function getRecete() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $user = AuthMiddleware::authenticate();
        $input = json_decode(file_get_contents('php://input'), true);
        $dataName = $input['dataName'] ?? '';
        $siparisId = $input['siparisId'] ?? '';

        if (empty($dataName) || empty($siparisId)) {
            Response::error('dataName ve siparisId gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $pdo = Database::getConnection($dataName);

            $sql = "
                SELECT
                    sr.id,
                    sr.siparis_master_id,
                    sr.siparis_detay_id,
                    sr.kalem_tipi,
                    sr.malzeme_tipi,
                    sr.stok_varyant_id,
                    sr.islem_adi,
                    sr.miktar,
                    sr.birim_id,
                    sr.birim_fiyat,
                    sr.doviz,
                    sr.toplam_tutar,
                    sr.aciklama,
                    sr.sira_no,
                    COALESCE(sv.varyant_adi, '') AS varyant_adi,
                    COALESCE(sv.varyant_kodu, '') AS varyant_kodu,
                    COALESCE(sv.barkod, '') AS varyant_barkod,
                    COALESCE(sv.stok_grup_kodu, '') AS stok_grup_kodu,
                    COALESCE(sm.stok_adi, '') AS stok_adi,
                    COALESCE(sm.stok_kodu, '') AS stok_kodu,
                    COALESCE(t_birim.tanim_deger, '') AS birim_adi
                FROM siparis_recete sr
                LEFT JOIN stok_varyant sv ON sv.id = sr.stok_varyant_id
                LEFT JOIN stok_master sm ON sm.id = sv.stok_master_id
                LEFT JOIN tanimlar t_birim ON t_birim.id = sr.birim_id
                WHERE sr.siparis_master_id = :siparisId AND sr.aktif = 1
                ORDER BY sr.siparis_detay_id ASC, sr.sira_no ASC, sr.id ASC
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([':siparisId' => $siparisId]);
            $rows = $stmt->fetchAll();

            $items = [];
            $toplamByDoviz = [];

            foreach ($rows as $row) {
                $doviz = $row['doviz'] ?: 'TL';
                $toplamTutar = (float)$row['toplam_tutar'];

                if (!isset($toplamByDoviz[$doviz])) {
                    $toplamByDoviz[$doviz] = 0;
                }
                $toplamByDoviz[$doviz] += $toplamTutar;

                $kalemTipiLabel = match($row['kalem_tipi']) {
                    'ana' => 'Ana Malzeme',
                    'yan' => 'Yan Malzeme',
                    'malzeme' => 'Malzeme',
                    'gider' => 'Gider',
                    'diger' => 'Diğer',
                    default => $row['kalem_tipi'],
                };

                $items[] = [
                    'id' => (string)$row['id'],
                    'siparisDetayId' => (string)$row['siparis_detay_id'],
                    'kalemTipi' => $row['kalem_tipi'],
                    'kalemTipiLabel' => $kalemTipiLabel,
                    'malzemeTipi' => $row['malzeme_tipi'] ?: '',
                    'islemAdi' => $row['islem_adi'] ?: '',
                    'varyantAdi' => $row['varyant_adi'],
                    'varyantKodu' => $row['varyant_kodu'],
                    'stokAdi' => $row['stok_adi'],
                    'stokKodu' => $row['stok_kodu'],
                    'stokGrupKodu' => $row['stok_grup_kodu'],
                    'miktar' => (float)$row['miktar'],
                    'birimAdi' => $row['birim_adi'],
                    'birimFiyat' => (float)$row['birim_fiyat'],
                    'doviz' => $doviz,
                    'toplamTutar' => $toplamTutar,
                    'aciklama' => $row['aciklama'] ?: '',
                    'siraNo' => (int)$row['sira_no'],
                ];
            }

            $summary = [];
            foreach ($toplamByDoviz as $doviz => $tutar) {
                $summary[] = ['doviz' => $doviz, 'toplam' => $tutar];
            }

            Response::success([
                'items' => $items,
                'count' => count($items),
                'summary' => $summary,
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /orders/uretime-al
     * Siparişi üretime al
     */
    public function uretimeAl() {
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
                "SELECT mobil_firmalar_id, ad_soyad FROM mobil_kullanici WHERE id = ?",
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

            // Siparişin mevcut durumunu kontrol et
            $siparis = $pdo->prepare("SELECT id, durum_bilgi, siparis_kodu FROM siparis_master WHERE id = ? AND aktif = 1");
            $siparis->execute([$siparisId]);
            $siparisRow = $siparis->fetch();

            if (!$siparisRow) {
                Response::error('Sipariş bulunamadı', 'ORDER_NOT_FOUND', 404);
            }

            $mevcutDurumBilgi = $siparisRow['durum_bilgi'] ? json_decode($siparisRow['durum_bilgi'], true) : [];
            if (!empty($mevcutDurumBilgi['uretimOnay'])) {
                Response::error('Bu sipariş zaten üretime alınmış', 'ALREADY_IN_PRODUCTION', 400);
            }

            // durum_bilgi JSON'ını güncelle
            $mevcutDurumBilgi['uretimOnay'] = true;
            $mevcutDurumBilgi['uretimOnayTarihi'] = date('Y-m-d H:i:s');
            $mevcutDurumBilgi['uretimOnayKullaniciId'] = $userId;
            $mevcutDurumBilgi['uretimOnayKullaniciAdi'] = $currentUser['ad_soyad'] ?? '';
            $mevcutDurumBilgi['uretimOnayIp'] = $_SERVER['REMOTE_ADDR'] ?? '';
            $durumBilgiJson = json_encode($mevcutDurumBilgi, JSON_UNESCAPED_UNICODE);

            // Üretime al
            $pdo->beginTransaction();
            try {
                // Master güncelle
                $stmt = $pdo->prepare(
                    "UPDATE siparis_master SET durum_bilgi = ? WHERE id = ?"
                );
                $stmt->execute([$durumBilgiJson, $siparisId]);

                // Tüm detay satırlarını üretimde yap
                $stmt2 = $pdo->prepare(
                    "UPDATE siparis_detay SET siparis_durum = 1 WHERE siparis_master_id = ? AND aktif = 1"
                );
                $stmt2->execute([$siparisId]);

                $pdo->commit();

                Response::success([
                    'message' => 'Sipariş üretime alındı',
                    'siparisKodu' => $siparisRow['siparis_kodu'],
                ]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /orders/lookups
     * Sipariş formu için lookup verileri (döviz, teslim şekli, paketleme, sonraki sipariş kodu)
     */
    public function getLookups() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        try {
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];
            $firmaId = $ctx['firmaId'];

            // Döviz tipleri
            $stmt = $pdo->prepare("SELECT id, doviz_tipi, doviz_adi, doviz_birimi FROM doviz_tipleri WHERE aktif = 1 ORDER BY id");
            $stmt->execute();
            $dovizTipleri = [];
            foreach ($stmt->fetchAll() as $row) {
                $dovizTipleri[] = [
                    'id' => (int)$row['id'],
                    'dovizTipi' => $row['doviz_tipi'],
                    'dovizAdi' => $row['doviz_adi'],
                    'dovizBirimi' => (int)$row['doviz_birimi'],
                ];
            }

            // Teslim şekli (tanimlardan)
            $stmt = $pdo->prepare("SELECT id, tanim_deger FROM tanimlar WHERE firma_id = :firmaId AND aktif = 1 AND tanim_kodu = 'TESLIM_SEKLI' ORDER BY sira, tanim_deger LIMIT 100");
            $stmt->execute([':firmaId' => $firmaId]);
            $teslimSekilleri = [];
            foreach ($stmt->fetchAll() as $row) {
                $teslimSekilleri[] = ['id' => (int)$row['id'], 'adi' => $row['tanim_deger']];
            }

            // Paketleme (tanimlardan)
            $stmt = $pdo->prepare("SELECT id, tanim_deger FROM tanimlar WHERE firma_id = :firmaId AND aktif = 1 AND tanim_kodu = 'PAKETLEME' ORDER BY sira, tanim_deger LIMIT 100");
            $stmt->execute([':firmaId' => $firmaId]);
            $paketlemeler = [];
            foreach ($stmt->fetchAll() as $row) {
                $paketlemeler[] = ['id' => (int)$row['id'], 'adi' => $row['tanim_deger']];
            }

            // Sonraki sipariş kodu
            $nextKod = $this->generateSiparisKodu($pdo, $firmaId);

            // Cariler listesi
            $stmt = $pdo->prepare("SELECT id, unvan, hesap_kodu, kur_tipi FROM cariler WHERE firma_id = :firmaId AND aktif = 1 ORDER BY unvan LIMIT 500");
            $stmt->execute([':firmaId' => $firmaId]);
            $cariler = [];
            foreach ($stmt->fetchAll() as $row) {
                $cariler[] = [
                    'id' => (int)$row['id'],
                    'unvan' => $row['unvan'],
                    'hesapKodu' => $row['hesap_kodu'] ?? '',
                    'kurTipi' => $row['kur_tipi'] ?? 'doviz_alis',
                ];
            }

            Response::success([
                'dovizTipleri' => $dovizTipleri,
                'teslimSekilleri' => $teslimSekilleri,
                'paketlemeler' => $paketlemeler,
                'nextSiparisKodu' => $nextKod,
                'cariler' => $cariler,
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /orders/create
     * Yeni sipariş oluştur
     */
    public function create() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        // Zorunlu alanlar
        $required = ['siparisKodu', 'siparisTipi', 'tarih', 'teslimTarihi', 'doviz', 'carilerId', 'siparisModul'];
        foreach ($required as $field) {
            if (empty($data[$field]) && $data[$field] !== 0) {
                Response::error("{$field} alanı gereklidir", 'VALIDATION_ERROR', 400);
            }
        }

        try {
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];
            $firmaId = $ctx['firmaId'];
            $subeId = $ctx['subeId'];

            // sube_id 0 ise firma'nın ilk şubesini al (FK constraint)
            if (!$subeId || $subeId == 0) {
                $subeStmt = $pdo->prepare("SELECT id FROM subeler WHERE firma_id = :firmaId AND aktif = 1 ORDER BY id LIMIT 1");
                $subeStmt->execute([':firmaId' => $firmaId]);
                $subeRow = $subeStmt->fetch();
                $subeId = $subeRow ? (int)$subeRow['id'] : 0;
            }

            $sql = "INSERT INTO siparis_master (
                firma_id, sube_id, cariler_id, siparis_modul, siparis_kodu,
                musteri_siparis_kodu, siparis_tipi, teslim_sekli_id, paketleme_id,
                tarih, teslim_tarihi, doviz, aciklama, master_avans_indirim, musteri_sube,
                deri_grubu, siparisi_alan, siparis_grubu_id, siparis_tipi_id,
                kayit_kullanici_id, kayit_ip, aktif
            ) VALUES (
                :firmaId, :subeId, :carilerId, :siparisModul, :siparisKodu,
                :musteriSiparisKodu, :siparisTipi, :teslimSekliId, :paketlemeId,
                :tarih, :teslimTarihi, :doviz, :aciklama, :masterAvansIndirim, :musteriSube,
                :deriGrubu, :siparisiAlan, :siparisGrubuId, :siparisTipiId,
                :kullaniciId, :ip, 1
            )";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':firmaId' => $firmaId,
                ':subeId' => $subeId,
                ':carilerId' => (int)$data['carilerId'],
                ':siparisModul' => $data['siparisModul'],
                ':siparisKodu' => $data['siparisKodu'],
                ':musteriSiparisKodu' => $data['musteriSiparisKodu'] ?? '',
                ':siparisTipi' => (int)$data['siparisTipi'],
                ':teslimSekliId' => (int)($data['teslimSekliId'] ?? 0),
                ':paketlemeId' => (int)($data['paketlemeId'] ?? 0),
                ':tarih' => $data['tarih'],
                ':teslimTarihi' => $data['teslimTarihi'],
                ':doviz' => $data['doviz'],
                ':aciklama' => $data['aciklama'] ?? '',
                ':masterAvansIndirim' => isset($data['masterAvansIndirim']) ? json_encode($data['masterAvansIndirim'], JSON_UNESCAPED_UNICODE) : null,
                ':musteriSube' => $data['musteriSube'] ?? '',
                ':deriGrubu' => $data['deriGrubu'] ?? '',
                ':siparisiAlan' => $data['siparisiAlan'] ?? '',
                ':siparisGrubuId' => (int)($data['siparisGrubuId'] ?? 0),
                ':siparisTipiId' => (int)($data['siparisTipiId'] ?? 0),
                ':kullaniciId' => $ctx['userId'],
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? '',
            ]);

            $newId = $pdo->lastInsertId();

            // ─── AVANS FİŞİ OLUŞTUR ─────────────────────────────────
            $avansFisIds = [];
            $masterAvansIndirim = $data['masterAvansIndirim'] ?? null;

            if ($masterAvansIndirim && !empty($masterAvansIndirim['avans'])) {
                require_once __DIR__ . '/../includes/FisService.php';

                // Şirket DB'sindeki firma_id'yi al
                $firmaStmt = $pdo->prepare("SELECT firma_id FROM subeler WHERE id = ?");
                $firmaStmt->execute([$subeId]);
                $firmaRow = $firmaStmt->fetch();
                $dbFirmaId = $firmaRow ? (int)$firmaRow['firma_id'] : $firmaId;

                $fisService = new FisService($pdo, $dbFirmaId, $subeId, $ctx['userId']);

                // Şube ayarlarından avans hesap kodunu al
                $subeAyarStmt = $pdo->prepare("SELECT sube_genel_ayar FROM subeler WHERE id = ?");
                $subeAyarStmt->execute([$subeId]);
                $subeAyarRow = $subeAyarStmt->fetch();
                $subeAyar = $subeAyarRow && $subeAyarRow['sube_genel_ayar']
                    ? json_decode($subeAyarRow['sube_genel_ayar'], true) : [];

                // Avans hesap kodu (340.xx) - şube ayarlarından
                $avansHesapId = $subeAyar['hesapKodlari']['siparisAvans'] ?? '';
                $avansHesapKodu = '';
                if ($avansHesapId) {
                    $hkStmt = $pdo->prepare("SELECT hesap_kodu FROM cariler WHERE id = ?");
                    $hkStmt->execute([$avansHesapId]);
                    $hkRow = $hkStmt->fetch();
                    $avansHesapKodu = $hkRow ? $hkRow['hesap_kodu'] : '';
                }

                // Cari hesap kodunu al (alacaklı taraf)
                $cariStmt = $pdo->prepare("SELECT hesap_kodu FROM cariler WHERE id = ?");
                $cariStmt->execute([(int)$data['carilerId']]);
                $cariRow = $cariStmt->fetch();
                $cariHesapKodu = $cariRow ? $cariRow['hesap_kodu'] : '';

                // Kasa durumu - şube ayarından
                $kasaDurum = ($subeAyar['fisleri_aktif_yaz'] ?? true) ? 1 : 0;

                // Hesap kodları kontrolü
                if (empty($avansHesapKodu)) {
                    Response::error('Avans hesap kodu tanımlı değil. subeId=' . $subeId . ', avansHesapId=' . $avansHesapId . ', subeAyar=' . json_encode($subeAyar), 'AVANS_HESAP_MISSING', 400);
                    return;
                }
                if (empty($cariHesapKodu)) {
                    Response::error('Cari hesap kodu bulunamadı. carilerId=' . $data['carilerId'], 'CARI_HESAP_MISSING', 400);
                    return;
                }

                // Şube ve cari döviz bilgileri
                $subeDoviz = $fisService->getSubeVarsayilanDoviz();
                $borcCariDoviz = $fisService->getCariDoviz($avansHesapKodu);
                $alacakCariDoviz = $fisService->getCariDoviz($cariHesapKodu);
                $siparisDoviz = $data['doviz'] ?? 'TL';
                $siparisTarih = $data['tarih'] ?? date('Y-m-d');

                // Her avans satırı için fiş oluştur
                $updatedAvansRows = $masterAvansIndirim['avans'];
                foreach ($updatedAvansRows as $idx => &$avansRow) {
                    $tutar = (float)($avansRow['tutar'] ?? 0);
                    if ($tutar <= 0) continue;

                    $result = $fisService->createParametrikFis(
                        [
                            'fisTipi' => 'Sipariş Avans',
                            'fisTarihi' => $siparisTarih . ' ' . date('H:i:s'),
                            'fisAciklama' => 'Sipariş Avans - ' . $data['siparisKodu'],
                            'kayitId' => (int)$newId,
                            'kayitTablo' => 'siparis_master',
                            'kasaDurum' => $kasaDurum,
                        ],
                        [
                            'tutar' => $tutar,
                            'islemDoviz' => $avansRow['doviz'] ?? $siparisDoviz,
                            'subeDoviz' => $subeDoviz,
                            'borcHesapKodu' => $avansHesapKodu,
                            'borcCariDoviz' => $borcCariDoviz,
                            'alacakHesapKodu' => $cariHesapKodu,
                            'alacakCariDoviz' => $alacakCariDoviz,
                            'tarih' => $siparisTarih,
                            'aciklama' => 'Sipariş Avans - ' . $data['siparisKodu'],
                        ]
                    );

                    $avansRow['fisId'] = $result['fisMasterId'];
                    $avansRow['fisNo'] = $result['fisNo'];
                    $avansRow['cariIslendi'] = true;
                    $avansFisIds[] = $result['fisMasterId'];
                }
                unset($avansRow);

                // JSON'ı fiş bilgileriyle güncelle
                $masterAvansIndirim['avans'] = $updatedAvansRows;

                // ─── İNDİRİM FİŞİ ───────────────────────────────────
                $indirim = $masterAvansIndirim['indirim'] ?? null;
                if ($indirim && ($indirim['tip'] ?? -1) !== -1 && ($indirim['deger'] ?? 0) > 0) {
                    if (empty($indirim['cariIslendi']) || empty($indirim['fisId'])) {
                        $indirimHesapId = $subeAyar['hesapKodlari']['siparisIndirim'] ?? '';
                        $indirimHesapKodu = '';
                        if ($indirimHesapId) {
                            $ihStmt = $pdo->prepare("SELECT hesap_kodu FROM cariler WHERE id = ?");
                            $ihStmt->execute([$indirimHesapId]);
                            $ihRow = $ihStmt->fetch();
                            $indirimHesapKodu = $ihRow ? $ihRow['hesap_kodu'] : '';
                        }

                        if (!empty($indirimHesapKodu) && !empty($cariHesapKodu)) {
                            $indirimTutar = (float)$indirim['deger'];
                            $indirimDoviz = $indirim['doviz'] ?? $siparisDoviz;
                            $indirimBorcCariDoviz = $fisService->getCariDoviz($indirimHesapKodu);

                            $result = $fisService->createParametrikFis(
                                [
                                    'fisTipi' => 'Sipariş İndirim',
                                    'fisTarihi' => $siparisTarih . ' ' . date('H:i:s'),
                                    'fisAciklama' => 'Sipariş İndirim - ' . $data['siparisKodu'],
                                    'kayitId' => (int)$newId,
                                    'kayitTablo' => 'siparis_master',
                                    'kasaDurum' => $kasaDurum,
                                ],
                                [
                                    'tutar' => $indirimTutar,
                                    'islemDoviz' => $indirimDoviz,
                                    'subeDoviz' => $subeDoviz,
                                    'borcHesapKodu' => $indirimHesapKodu,
                                    'borcCariDoviz' => $indirimBorcCariDoviz,
                                    'alacakHesapKodu' => $cariHesapKodu,
                                    'alacakCariDoviz' => $alacakCariDoviz,
                                    'tarih' => $siparisTarih,
                                    'aciklama' => 'Sipariş İndirim - ' . $data['siparisKodu'],
                                ]
                            );

                            $masterAvansIndirim['indirim']['fisId'] = $result['fisMasterId'];
                            $masterAvansIndirim['indirim']['fisNo'] = $result['fisNo'];
                            $masterAvansIndirim['indirim']['cariIslendi'] = true;
                        }
                    }
                }

                $updateJsonStmt = $pdo->prepare("UPDATE siparis_master SET master_avans_indirim = ? WHERE id = ?");
                $updateJsonStmt->execute([
                    json_encode($masterAvansIndirim, JSON_UNESCAPED_UNICODE),
                    $newId
                ]);
            }

            Response::success([
                'message' => 'Sipariş başarıyla oluşturuldu',
                'id' => (int)$newId,
                'siparisKodu' => $data['siparisKodu'],
                'avansFisIds' => $avansFisIds,
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /orders/update
     * Sipariş güncelle
     */
    public function update() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $siparisId = $data['siparisId'] ?? '';

        if (empty($siparisId)) {
            Response::error('siparisId gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];
            $firmaId = $ctx['firmaId'];

            // Sipariş mevcut verisi (log için)
            $check = $pdo->prepare("SELECT * FROM siparis_master WHERE id = ? AND firma_id = ?");
            $check->execute([$siparisId, $firmaId]);
            $eskiKayit = $check->fetch();
            if (!$eskiKayit) {
                Response::error('Sipariş bulunamadı', 'ORDER_NOT_FOUND', 404);
                return;
            }

            $allowedFields = [
                'siparisKodu' => 'siparis_kodu',
                'musteriSiparisKodu' => 'musteri_siparis_kodu',
                'siparisTipi' => 'siparis_tipi',
                'teslimSekliId' => 'teslim_sekli_id',
                'paketlemeId' => 'paketleme_id',
                'tarih' => 'tarih',
                'teslimTarihi' => 'teslim_tarihi',
                'doviz' => 'doviz',
                'aciklama' => 'aciklama',
                'masterAvansIndirim' => 'master_avans_indirim',
                'carilerId' => 'cariler_id',
                'musteriSube' => 'musteri_sube',
                'deriGrubu' => 'deri_grubu',
                'siparisiAlan' => 'siparisi_alan',
                'siparisGrubuId' => 'siparis_grubu_id',
                'siparisTipiId' => 'siparis_tipi_id',
            ];

            $updates = [];
            $params = [':id' => $siparisId, ':firmaId' => $firmaId];

            foreach ($allowedFields as $inputKey => $dbColumn) {
                if (array_key_exists($inputKey, $data)) {
                    $paramKey = ':' . $inputKey;
                    $updates[] = "{$dbColumn} = {$paramKey}";
                    if ($inputKey === 'masterAvansIndirim') {
                        $params[$paramKey] = $data[$inputKey] ? json_encode($data[$inputKey], JSON_UNESCAPED_UNICODE) : null;
                    } else {
                        $params[$paramKey] = $data[$inputKey];
                    }
                }
            }

            if (empty($updates)) {
                Response::error('Güncellenecek alan bulunamadı', 'VALIDATION_ERROR', 400);
            }

            // ─── AVANS FİŞ YÖNETİMİ ─────────────────────────────────
            $masterAvansIndirim = $data['masterAvansIndirim'] ?? null;
            $avansFisIds = [];

            if ($masterAvansIndirim && isset($masterAvansIndirim['avans'])) {
                require_once __DIR__ . '/../includes/FisService.php';

                // Mevcut JSON'ı al
                $mevcutStmt = $pdo->prepare("SELECT master_avans_indirim, cariler_id, siparis_kodu, tarih, doviz, sube_id FROM siparis_master WHERE id = ?");
                $mevcutStmt->execute([$siparisId]);
                $mevcutRow = $mevcutStmt->fetch();
                $mevcutJson = $mevcutRow['master_avans_indirim'] ? json_decode($mevcutRow['master_avans_indirim'], true) : [];
                $mevcutAvanslar = $mevcutJson['avans'] ?? [];

                $siparisKodu = $data['siparisKodu'] ?? $mevcutRow['siparis_kodu'] ?? '';
                $siparisTarihi = $data['tarih'] ?? $mevcutRow['tarih'] ?? date('Y-m-d');
                $siparisDoviz = $data['doviz'] ?? $mevcutRow['doviz'] ?? 'TL';
                $carilerId = (int)($data['carilerId'] ?? $mevcutRow['cariler_id'] ?? 0);
                $siparisSubeId = (int)($mevcutRow['sube_id'] ?? $ctx['subeId']);

                // Şirket DB'sindeki firma_id
                $firmaStmt = $pdo->prepare("SELECT firma_id FROM subeler WHERE id = ?");
                $firmaStmt->execute([$siparisSubeId]);
                $firmaRow = $firmaStmt->fetch();
                $dbFirmaId = $firmaRow ? (int)$firmaRow['firma_id'] : $firmaId;

                $fisService = new FisService($pdo, $dbFirmaId, $siparisSubeId, $ctx['userId']);

                // Şube ayarlarından avans hesap kodu
                $subeAyarStmt = $pdo->prepare("SELECT sube_genel_ayar FROM subeler WHERE id = ?");
                $subeAyarStmt->execute([$siparisSubeId]);
                $subeAyarRow = $subeAyarStmt->fetch();
                $subeAyar = $subeAyarRow && $subeAyarRow['sube_genel_ayar']
                    ? json_decode($subeAyarRow['sube_genel_ayar'], true) : [];

                $avansHesapId = $subeAyar['hesapKodlari']['siparisAvans'] ?? '';
                $avansHesapKodu = '';
                if ($avansHesapId) {
                    $hkStmt = $pdo->prepare("SELECT hesap_kodu FROM cariler WHERE id = ?");
                    $hkStmt->execute([$avansHesapId]);
                    $hkRow = $hkStmt->fetch();
                    $avansHesapKodu = $hkRow ? $hkRow['hesap_kodu'] : '';
                }

                // Cari hesap kodu
                $cariStmt = $pdo->prepare("SELECT hesap_kodu FROM cariler WHERE id = ?");
                $cariStmt->execute([$carilerId]);
                $cariRow = $cariStmt->fetch();
                $cariHesapKodu = $cariRow ? $cariRow['hesap_kodu'] : '';

                $kasaDurum = ($subeAyar['fisleri_aktif_yaz'] ?? true) ? 1 : 0;

                // Mevcut fişleri topla (silinen/değişen için)
                $eskiFisIds = [];
                foreach ($mevcutAvanslar as $ma) {
                    if (!empty($ma['fisId'])) $eskiFisIds[] = (int)$ma['fisId'];
                }

                // Hesap kodları kontrolü
                if (empty($avansHesapKodu)) {
                    Response::error('Avans hesap kodu tanımlı değil. subeId=' . $ctx['subeId'] . ', avansHesapId=' . $avansHesapId . ', subeAyar=' . json_encode($subeAyar), 'AVANS_HESAP_MISSING', 400);
                    return;
                }
                if (empty($cariHesapKodu)) {
                    Response::error('Cari hesap kodu bulunamadı. Lütfen geçerli bir cari hesap seçin.', 'CARI_HESAP_MISSING', 400);
                    return;
                }

                // Yeni avans satırlarını işle
                $yeniAvanslar = $masterAvansIndirim['avans'];
                $yeniFisIds = [];

                foreach ($yeniAvanslar as $idx => &$avansRow) {
                    $tutar = (float)($avansRow['tutar'] ?? 0);

                    // cariIslendi=true ve fisId varsa → tutar değişmiş mi kontrol et
                    if (!empty($avansRow['cariIslendi']) && !empty($avansRow['fisId'])) {
                        // Eski tutarı bul
                        $eskiTutar = 0;
                        foreach ($mevcutAvanslar as $ma) {
                            if (!empty($ma['fisId']) && (int)$ma['fisId'] === (int)$avansRow['fisId']) {
                                $eskiTutar = (float)($ma['tutar'] ?? 0);
                                break;
                            }
                        }
                        // Tutar değişmediyse dokunma
                        if (abs($eskiTutar - $tutar) < 0.01) {
                            $yeniFisIds[] = (int)$avansRow['fisId'];
                            $avansFisIds[] = (int)$avansRow['fisId'];
                            continue;
                        }
                        // Tutar değiştiyse eski fişi sil, yenisi aşağıda yazılacak
                        $fisService->deleteFisWithDetay((int)$avansRow['fisId']);
                        $avansRow['cariIslendi'] = false;
                        unset($avansRow['fisId'], $avansRow['fisNo']);
                    }

                    // Tutar 0 veya hesap kodu yoksa atla
                    if ($tutar <= 0 || empty($avansHesapKodu) || empty($cariHesapKodu)) continue;

                    // Şube ve cari döviz bilgileri
                    $subeDoviz = $fisService->getSubeVarsayilanDoviz();
                    $borcCariDoviz = $fisService->getCariDoviz($avansHesapKodu);
                    $alacakCariDoviz = $fisService->getCariDoviz($cariHesapKodu);

                    $result = $fisService->createParametrikFis(
                        [
                            'fisTipi' => 'Sipariş Avans',
                            'fisTarihi' => $siparisTarihi . ' ' . date('H:i:s'),
                            'fisAciklama' => 'Sipariş Avans - ' . $siparisKodu,
                            'kayitId' => (int)$siparisId,
                            'kayitTablo' => 'siparis_master',
                            'kasaDurum' => $kasaDurum,
                        ],
                        [
                            'tutar' => $tutar,
                            'islemDoviz' => $avansRow['doviz'] ?? $siparisDoviz,
                            'subeDoviz' => $subeDoviz,
                            'borcHesapKodu' => $avansHesapKodu,
                            'borcCariDoviz' => $borcCariDoviz,
                            'alacakHesapKodu' => $cariHesapKodu,
                            'alacakCariDoviz' => $alacakCariDoviz,
                            'tarih' => $siparisTarihi,
                            'aciklama' => 'Sipariş Avans - ' . $siparisKodu,
                        ]
                    );

                    $avansRow['fisId'] = $result['fisMasterId'];
                    $avansRow['fisNo'] = $result['fisNo'];
                    $avansRow['cariIslendi'] = true;
                    $yeniFisIds[] = $result['fisMasterId'];
                    $avansFisIds[] = $result['fisMasterId'];
                }
                unset($avansRow);

                // Silinen avansların fişlerini soft delete
                $silinenFisIds = array_diff($eskiFisIds, $yeniFisIds);
                foreach ($silinenFisIds as $eskiFisId) {
                    $fisService->deleteFisWithDetay($eskiFisId);
                }

                // JSON güncelle
                $masterAvansIndirim['avans'] = $yeniAvanslar;

                // ─── İNDİRİM FİŞİ ───────────────────────────────────
                $indirim = $masterAvansIndirim['indirim'] ?? null;
                if ($indirim && ($indirim['tip'] ?? -1) !== -1 && ($indirim['deger'] ?? 0) > 0) {
                    $indirimHesapId = $subeAyar['hesapKodlari']['siparisIndirim'] ?? '';
                    $indirimHesapKodu = '';
                    if ($indirimHesapId) {
                        $ihStmt = $pdo->prepare("SELECT hesap_kodu FROM cariler WHERE id = ?");
                        $ihStmt->execute([$indirimHesapId]);
                        $ihRow = $ihStmt->fetch();
                        $indirimHesapKodu = $ihRow ? $ihRow['hesap_kodu'] : '';
                    }

                    if (!empty($indirimHesapKodu) && !empty($cariHesapKodu)) {
                        // Mevcut indirim fişi varsa tutar değişmiş mi kontrol et
                        if (!empty($indirim['cariIslendi']) && !empty($indirim['fisId'])) {
                            $eskiIndirim = $mevcutJson['indirim'] ?? [];
                            $eskiDeger = (float)($eskiIndirim['deger'] ?? 0);
                            $yeniDeger = (float)$indirim['deger'];

                            if (abs($eskiDeger - $yeniDeger) < 0.01) {
                                // Tutar değişmedi, dokunma
                            } else {
                                // Tutar değişti, eski fişi sil
                                $fisService->deleteFisWithDetay((int)$indirim['fisId']);
                                $indirim['cariIslendi'] = false;
                                unset($indirim['fisId'], $indirim['fisNo']);
                                $masterAvansIndirim['indirim'] = $indirim;
                            }
                        }

                        // Fiş yazılmamışsa yaz
                        if (empty($indirim['cariIslendi']) || empty($indirim['fisId'])) {
                            $indirimTutar = (float)$indirim['deger'];
                            $indirimDoviz = $indirim['doviz'] ?? $siparisDoviz;
                            $indirimBorcCariDoviz = $fisService->getCariDoviz($indirimHesapKodu);
                            $updSubeDoviz = $fisService->getSubeVarsayilanDoviz();
                            $updAlacakCariDoviz = $fisService->getCariDoviz($cariHesapKodu);

                            $result = $fisService->createParametrikFis(
                                [
                                    'fisTipi' => 'Sipariş İndirim',
                                    'fisTarihi' => $siparisTarihi . ' ' . date('H:i:s'),
                                    'fisAciklama' => 'Sipariş İndirim - ' . $siparisKodu,
                                    'kayitId' => (int)$siparisId,
                                    'kayitTablo' => 'siparis_master',
                                    'kasaDurum' => $kasaDurum,
                                ],
                                [
                                    'tutar' => $indirimTutar,
                                    'islemDoviz' => $indirimDoviz,
                                    'subeDoviz' => $updSubeDoviz,
                                    'borcHesapKodu' => $indirimHesapKodu,
                                    'borcCariDoviz' => $indirimBorcCariDoviz,
                                    'alacakHesapKodu' => $cariHesapKodu,
                                    'alacakCariDoviz' => $updAlacakCariDoviz,
                                    'tarih' => $siparisTarihi,
                                    'aciklama' => 'Sipariş İndirim - ' . $siparisKodu,
                                ]
                            );

                            $masterAvansIndirim['indirim']['fisId'] = $result['fisMasterId'];
                            $masterAvansIndirim['indirim']['fisNo'] = $result['fisNo'];
                            $masterAvansIndirim['indirim']['cariIslendi'] = true;
                        }
                    }
                } else if ($indirim && !empty($indirim['fisId'])) {
                    // İndirim kaldırıldı ama eski fişi var, sil
                    $fisService->deleteFisWithDetay((int)$indirim['fisId']);
                    $masterAvansIndirim['indirim']['cariIslendi'] = false;
                    unset($masterAvansIndirim['indirim']['fisId'], $masterAvansIndirim['indirim']['fisNo']);
                }

                $params[':masterAvansIndirim'] = json_encode($masterAvansIndirim, JSON_UNESCAPED_UNICODE);
                if (!in_array('master_avans_indirim = :masterAvansIndirim', $updates)) {
                    $updates[] = 'master_avans_indirim = :masterAvansIndirim';
                }
            }

            $updateClause = implode(', ', $updates);
            $sql = "UPDATE siparis_master SET {$updateClause} WHERE id = :id AND firma_id = :firmaId";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            // Log yaz
            require_once __DIR__ . '/../includes/LogService.php';
            $yeniKayit = [];
            foreach ($allowedFields as $inputKey => $dbColumn) {
                if (array_key_exists($inputKey, $data)) {
                    $yeniKayit[$dbColumn] = $data[$inputKey];
                }
            }
            $logFirmaId = $eskiKayit['firma_id'] ?? $firmaId;
            $logSubeId = $eskiKayit['sube_id'] ?? $ctx['subeId'];
            $logService = new LogService($pdo, (int)$logFirmaId, (int)$logSubeId, $ctx['userId']);
            $logService->duzenle('siparis_master', (int)$siparisId, $eskiKayit, $yeniKayit, 'Sipariş güncellendi - ' . ($eskiKayit['siparis_kodu'] ?? ''));

            Response::success([
                'message' => 'Sipariş başarıyla güncellendi',
                'avansFisIds' => $avansFisIds,
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /orders/detail-lookups
     * Sipariş detay formu için lookup verileri (beden setleri, model kartlar)
     */
    public function getDetailLookups() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];
        $dataName = $data['dataName'] ?? '';

        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];
            $firmaId = $ctx['firmaId'];

            // Beden Setleri (firma_id = firmaId, aynı diğer endpointler gibi)
            $bedenSql = "SELECT id, set_tipi, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12
                         FROM beden_setleri
                         WHERE firma_id = :firmaId AND aktif = 1
                         ORDER BY set_tipi";
            $bedenStmt = $pdo->prepare($bedenSql);
            $bedenStmt->execute([':firmaId' => $firmaId]);
            $bedenRows = $bedenStmt->fetchAll();

            $bedenSetleri = [];
            foreach ($bedenRows as $bs) {
                $bedenler = [];
                for ($i = 1; $i <= 12; $i++) {
                    $val = trim($bs['b' . $i] ?? '');
                    if ($val !== '') {
                        $bedenler[] = $val;
                    }
                }
                $bedenSetleri[] = [
                    'id' => (int)$bs['id'],
                    'setTipi' => $bs['set_tipi'],
                    'bedenler' => $bedenler,
                ];
            }

            // Model Kartlar
            $modelSql = "SELECT mk.id, mk.model_adi, COALESCE(mk.beden_setleri_id, 0) as beden_set_id
                         FROM model_kartlar mk
                         WHERE mk.firma_id = :firmaId AND mk.aktif = 1
                         ORDER BY mk.model_adi";
            $modelStmt = $pdo->prepare($modelSql);
            $modelStmt->execute([':firmaId' => $firmaId]);
            $modelRows = $modelStmt->fetchAll();

            $modelKartlar = [];
            foreach ($modelRows as $mk) {
                $modelKartlar[] = [
                    'id' => (int)$mk['id'],
                    'modelKodu' => '',
                    'modelAdi' => $mk['model_adi'],
                    'bedenSetId' => (int)$mk['beden_set_id'],
                ];
            }

            Response::success([
                'bedenSetleri' => $bedenSetleri,
                'modelKartlar' => $modelKartlar,
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /orders/detail-varyantlar
     * Model seçildiğinde varyantları getir
     */
    public function getDetailVaryantlar() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];
        $dataName = $data['dataName'] ?? '';
        $modelId = (int)($data['modelId'] ?? 0);

        if (empty($dataName) || $modelId <= 0) {
            Response::error('dataName ve modelId gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];
            $firmaId = $ctx['firmaId'];

            $sql = "SELECT sv.id, sv.varyant_adi, sv.varyant_kodu, COALESCE(sv.stok_grup_kodu, '') as stok_grup_kodu, COALESCE(sv.barkod, '') as barkod
                    FROM stok_varyantlar sv
                    INNER JOIN stok_master sm ON sm.id = sv.stok_master_id
                    WHERE sm.model_id = :modelId AND sm.firma_id = :firmaId AND sv.aktif = 1
                    ORDER BY sv.varyant_adi";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':modelId' => $modelId, ':firmaId' => $firmaId]);
            $rows = $stmt->fetchAll();

            $varyantlar = [];
            foreach ($rows as $row) {
                $varyantlar[] = [
                    'id' => (int)$row['id'],
                    'varyantAdi' => $row['varyant_adi'],
                    'varyantKodu' => $row['varyant_kodu'],
                    'stokGrupKodu' => $row['stok_grup_kodu'],
                    'barkod' => $row['barkod'],
                ];
            }

            Response::success([
                'varyantlar' => $varyantlar,
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /orders/add-detail
     * Sipariş detay satırı ekle
     */
    public function addDetail() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];
        $dataName = $data['dataName'] ?? '';
        $siparisMasterId = (int)($data['siparisMasterId'] ?? 0);

        if (empty($dataName) || $siparisMasterId <= 0) {
            Response::error('dataName ve siparisMasterId gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];
            $firmaId = $ctx['firmaId'];
            $subeId = $ctx['subeId'];

            // Siparişin bu firmaya ait olduğunu doğrula
            $checkStmt = $pdo->prepare("SELECT id FROM siparis_master WHERE id = :id AND firma_id = :firmaId");
            $checkStmt->execute([':id' => $siparisMasterId, ':firmaId' => $firmaId]);
            if (!$checkStmt->fetch()) {
                Response::error('Sipariş bulunamadı', 'NOT_FOUND', 404);
            }

            $modelId = (int)($data['modelId'] ?? 0);
            $varyantId = (int)($data['varyantId'] ?? 0);
            $bedenSetId = (int)($data['bedenSetId'] ?? 0);
            $fiyat = floatval($data['fiyat'] ?? 0);
            $doviz = $data['doviz'] ?? 'USD';
            $kdvOran = floatval($data['kdvOran'] ?? 0);
            $indirimTip = (int)($data['indirimTipi'] ?? -1);
            $indirim = floatval($data['indirimDeger'] ?? 0);
            $aciklama = $data['aciklama'] ?? '';
            $satisFiyat = floatval($data['satisFiyat'] ?? 0);
            $maliyetFiyat = floatval($data['maliyetFiyat'] ?? 0);
            $bedenMiktarlar = $data['bedenMiktarlar'] ?? [];

            // Beden miktarlarını b1-b12 kolonlarına map et
            $b = array_fill(1, 12, 0);
            $toplamMiktar = 0;
            if ($bedenSetId > 0 && !empty($bedenMiktarlar)) {
                // Beden seti bilgisini al
                $bsStmt = $pdo->prepare("SELECT b1,b2,b3,b4,b5,b6,b7,b8,b9,b10,b11,b12 FROM beden_setleri WHERE id = :id");
                $bsStmt->execute([':id' => $bedenSetId]);
                $bsRow = $bsStmt->fetch();
                if ($bsRow) {
                    for ($i = 1; $i <= 12; $i++) {
                        $bedenAdi = trim($bsRow['b' . $i] ?? '');
                        if ($bedenAdi !== '' && isset($bedenMiktarlar[$bedenAdi])) {
                            $b[$i] = (int)$bedenMiktarlar[$bedenAdi];
                            $toplamMiktar += $b[$i];
                        }
                    }
                }
            }

            // Stok master id'yi bul (model üzerinden)
            $stokMasterId = 0;
            $stokVaryantId = $varyantId;
            if ($modelId > 0) {
                $smStmt = $pdo->prepare("SELECT id FROM stok_master WHERE model_id = :modelId AND firma_id = :firmaId AND aktif = 1 LIMIT 1");
                $smStmt->execute([':modelId' => $modelId, ':firmaId' => $firmaId]);
                $smRow = $smStmt->fetch();
                if ($smRow) {
                    $stokMasterId = (int)$smRow['id'];
                }
            }

            $sql = "INSERT INTO siparis_detay (
                        siparis_master_id, model_id, stok_master_id, stok_varyant_id,
                        fiyat, doviz, kdv_oran, satis_fiyat, maliyet_fiyat,
                        indirim, indirim_tip, beden_set_id,
                        b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12,
                        miktar, aciklama, ekleyen_kullanici_id, kayit_ip, aktif
                    ) VALUES (
                        :siparisMasterId, :modelId, :stokMasterId, :stokVaryantId,
                        :fiyat, :doviz, :kdvOran, :satisFiyat, :maliyetFiyat,
                        :indirim, :indirimTip, :bedenSetId,
                        :b1, :b2, :b3, :b4, :b5, :b6, :b7, :b8, :b9, :b10, :b11, :b12,
                        :miktar, :aciklama, :userId, :ip, 1
                    )";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':siparisMasterId' => $siparisMasterId,
                ':modelId' => $modelId,
                ':stokMasterId' => $stokMasterId,
                ':stokVaryantId' => $stokVaryantId,
                ':fiyat' => $fiyat,
                ':doviz' => $doviz,
                ':kdvOran' => $kdvOran,
                ':satisFiyat' => $satisFiyat,
                ':maliyetFiyat' => $maliyetFiyat,
                ':indirim' => $indirim,
                ':indirimTip' => $indirimTip,
                ':bedenSetId' => $bedenSetId,
                ':b1' => $b[1], ':b2' => $b[2], ':b3' => $b[3], ':b4' => $b[4],
                ':b5' => $b[5], ':b6' => $b[6], ':b7' => $b[7], ':b8' => $b[8],
                ':b9' => $b[9], ':b10' => $b[10], ':b11' => $b[11], ':b12' => $b[12],
                ':miktar' => $toplamMiktar,
                ':aciklama' => $aciklama,
                ':userId' => $ctx['userId'],
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? '',
            ]);

            $detayId = $pdo->lastInsertId();

            Response::success([
                'message' => 'Sipariş kalemi başarıyla eklendi',
                'detayId' => (int)$detayId,
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * Sipariş kodu üret - ORD{YIL}{6 haneli sıra}
     */
    private function generateSiparisKodu($pdo, $firmaId)
    {
        $year = date('Y');
        $prefix = "ORD{$year}";

        $sql = "SELECT siparis_kodu
                FROM siparis_master
                WHERE firma_id = :firma_id
                AND siparis_kodu LIKE :prefix
                ORDER BY siparis_kodu DESC
                LIMIT 1";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':firma_id' => $firmaId,
            ':prefix' => $prefix . '%'
        ]);
        $result = $stmt->fetch();

        if ($result && !empty($result['siparis_kodu'])) {
            $lastKod = $result['siparis_kodu'];
            $lastSira = (int)substr($lastKod, -6);
            $newSira = $lastSira + 1;
        } else {
            $newSira = 1;
        }

        return $prefix . str_pad($newSira, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Sipariş İptal Et
     * POST /orders/cancel
     */
    public function cancel() {
        try {
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];
            $firmaId = $ctx['firmaId'];
            $subeId = $ctx['subeId'];
            $userId = $ctx['userId'];
            $currentUser = $ctx['currentUser'];

            $input = json_decode(file_get_contents('php://input'), true);
            $siparisId = $input['siparisMasterId'] ?? null;

            if (!$siparisId) {
                Response::error('Sipariş ID gerekli', 'MISSING_ORDER_ID', 400);
            }

            // Siparişi kontrol et
            $stmt = $pdo->prepare("SELECT id, siparis_kodu, aktif, durum_bilgi FROM siparis_master WHERE id = ? AND firma_id = ? AND sube_id = ?");
            $stmt->execute([$siparisId, $firmaId, $subeId]);
            $siparis = $stmt->fetch();

            if (!$siparis) {
                Response::error('Sipariş bulunamadı', 'ORDER_NOT_FOUND', 404);
            }

            if ((int)$siparis['aktif'] === -2) {
                Response::error('Bu sipariş zaten iptal edilmiş', 'ALREADY_CANCELLED', 400);
            }

            // durum_bilgi JSON'ını güncelle
            $durumBilgi = $siparis['durum_bilgi'] ? json_decode($siparis['durum_bilgi'], true) : [];
            $durumBilgi['iptalTarihi'] = date('Y-m-d H:i:s');
            $durumBilgi['iptalKullaniciId'] = $userId;
            $durumBilgi['iptalKullaniciAdi'] = $currentUser['ad_soyad'] ?? '';
            $durumBilgi['iptalIp'] = $_SERVER['REMOTE_ADDR'] ?? '';
            $durumBilgiJson = json_encode($durumBilgi, JSON_UNESCAPED_UNICODE);

            // İptal et: aktif = -2
            $stmt = $pdo->prepare("UPDATE siparis_master SET aktif = -2, durum_bilgi = ? WHERE id = ?");
            $stmt->execute([$durumBilgiJson, $siparisId]);

            // Log yaz
            require_once __DIR__ . '/../includes/LogService.php';
            $logFirmaId = (int)($siparis['firma_id'] ?? $firmaId);
            $logSubeId = (int)($siparis['sube_id'] ?? $subeId);
            $logService = new LogService($pdo, $logFirmaId, $logSubeId, $userId);
            $logService->sil('siparis_master', (int)$siparisId, $siparis, 'Sipariş iptal edildi - ' . $siparis['siparis_kodu']);

            Response::success([
                'message' => $siparis['siparis_kodu'] . ' iptal edildi',
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }
}
