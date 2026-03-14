<?php
/**
 * Model Kart Controller
 * Model kartları listeleme işlemleri
 */

class ModelKartController {
    /**
     * POST /model-kart/list
     * Model kartları listesi
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
        $search = $data['search'] ?? '';

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

            // Build query
            $params = [];
            $conditions = ["mk.aktif = 1", "mk.firma_id = :firmaId"];
            $params[':firmaId'] = $firmaId;

            // Arama filtresi
            if (!empty($search)) {
                $conditions[] = "(mk.model_adi LIKE :search OR mk.marka LIKE :search2 OR mk.modelist LIKE :search3 OR mk.tasarimci LIKE :search4)";
                $params[':search'] = "%{$search}%";
                $params[':search2'] = "%{$search}%";
                $params[':search3'] = "%{$search}%";
                $params[':search4'] = "%{$search}%";
            }

            $whereClause = implode(' AND ', $conditions);

            $sql = "
                SELECT
                    mk.id,
                    mk.model_adi,
                    mk.barkod_tipi,
                    mk.modelist,
                    mk.tasarimci,
                    mk.marka,
                    mk.boy,
                    mk.set_parca,
                    mk.set_icerik,
                    mk.aciklama,
                    mk.baz_beden,
                    mk.katsayi,
                    mk.kayit_tarihi,
                    mk.ana_model_id,
                    mk.model_tipi_id,
                    mk.cinsiyet_id,
                    mk.tarz_id,
                    mk.sezon_id,
                    mk.beden_setleri_id,
                    COALESCE(t_ana_model.tanim_deger, '') AS ana_model,
                    COALESCE(t_tip.tanim_deger, '') AS model_tipi,
                    COALESCE(t_cinsiyet.tanim_deger, '') AS cinsiyet,
                    COALESCE(t_tarz.tanim_deger, '') AS tarz,
                    COALESCE(t_sezon.tanim_deger, '') AS sezon
                FROM model_kartlar mk
                LEFT JOIN tanimlar t_ana_model ON t_ana_model.id = mk.ana_model_id
                LEFT JOIN tanimlar t_tip ON t_tip.id = mk.model_tipi_id
                LEFT JOIN tanimlar t_cinsiyet ON t_cinsiyet.id = mk.cinsiyet_id
                LEFT JOIN tanimlar t_tarz ON t_tarz.id = mk.tarz_id
                LEFT JOIN tanimlar t_sezon ON t_sezon.id = mk.sezon_id
                WHERE {$whereClause}
                ORDER BY mk.model_adi ASC
                LIMIT 500
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            // Model resimlerini dosyalar tablosundan al
            $modelIds = array_column($rows, 'id');
            $imageMap = [];
            if (!empty($modelIds)) {
                $placeholders = implode(',', array_fill(0, count($modelIds), '?'));
                $imgSql = "
                    SELECT d.id, d.modul_kayit_id, d.dosya_yolu, d.dosya_adi, d.dosya_tipi, d.tanim_id,
                           t.tanim_deger AS renk_adi
                    FROM dosyalar d
                    LEFT JOIN tanimlar t ON t.id = d.tanim_id AND t.tanim_kodu = 'RENK'
                    WHERE d.modul = 'model_kartlar'
                      AND d.modul_kayit_id IN ({$placeholders})
                      AND d.aktif = 1
                      AND d.dosya_tipi IN ('jpg', 'jpeg', 'png', 'webp', 'gif')
                    ORDER BY d.id ASC
                ";
                $imgStmt = $pdo->prepare($imgSql);
                $imgStmt->execute($modelIds);
                $imgRows = $imgStmt->fetchAll();
                foreach ($imgRows as $img) {
                    $mid = (int)$img['modul_kayit_id'];
                    if (!isset($imageMap[$mid])) {
                        $imageMap[$mid] = [];
                    }
                    $imageMap[$mid][] = [
                        'id' => (int)$img['id'],
                        'url' => $img['dosya_yolu'],
                        'renkAdi' => $img['renk_adi'] ?: null,
                    ];
                }
            }

            // Map rows
            $items = [];
            foreach ($rows as $row) {
                $id = (int)$row['id'];
                $items[] = [
                    'id' => $id,
                    'modelAdi' => $row['model_adi'] ?: '',
                    'barkodTipi' => $row['barkod_tipi'] ?: 'tekil',
                    'anaModel' => $row['ana_model'],
                    'anaModelId' => (int)$row['ana_model_id'],
                    'modelTipi' => $row['model_tipi'],
                    'modelTipiId' => (int)$row['model_tipi_id'],
                    'cinsiyet' => $row['cinsiyet'],
                    'cinsiyetId' => (int)$row['cinsiyet_id'],
                    'modelist' => $row['modelist'] ?: '',
                    'tasarimci' => $row['tasarimci'] ?: '',
                    'tarz' => $row['tarz'],
                    'tarzId' => (int)$row['tarz_id'],
                    'sezon' => $row['sezon'],
                    'sezonId' => (int)$row['sezon_id'],
                    'marka' => $row['marka'] ?: '',
                    'boy' => $row['boy'] ?: '',
                    'setParca' => (int)$row['set_parca'],
                    'setIcerik' => $row['set_icerik'] ?: '',
                    'aciklama' => $row['aciklama'] ?: '',
                    'bazBeden' => $row['baz_beden'] ?: '',
                    'bedenSetleriId' => (int)$row['beden_setleri_id'],
                    'katsayi' => $row['katsayi'] ? (float)$row['katsayi'] : null,
                    'kayitTarihi' => $row['kayit_tarihi'],
                    'resimler' => $imageMap[$id] ?? [],
                ];
            }

            Response::success([
                'data' => $items,
                'count' => count($items),
            ]);

        } catch (PDOException $e) {
            Response::serverError('Veritabanı hatası: ' . $e->getMessage());
        } catch (Exception $e) {
            Response::serverError('Model kartları alınamadı: ' . $e->getMessage());
        }
    }

    /**
     * POST /model-kart/upload-image
     * Model kartına resim yükleme
     */
    public function uploadImage() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $modelId = $_POST['modelId'] ?? '';
        $dataName = $_POST['dataName'] ?? '';

        if (empty($modelId) || empty($dataName)) {
            Response::error('modelId ve dataName gereklidir', 'VALIDATION_ERROR', 400);
        }

        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            Response::error('Resim dosyası gereklidir', 'FILE_REQUIRED', 400);
        }

        $file = $_FILES['image'];

        // Dosya boyutu kontrolü (10MB max)
        if ($file['size'] > 10 * 1024 * 1024) {
            Response::error('Dosya boyutu 10MB\'dan büyük olamaz', 'FILE_TOO_LARGE', 400);
        }

        // MIME tipi kontrolü
        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $allowedTypes)) {
            Response::error('Geçersiz dosya tipi. Sadece JPG, PNG, WebP ve GIF kabul edilir.', 'INVALID_FILE_TYPE', 400);
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
            $dbNameVal = $veritabani['veriAdi'] ?? '';

            if (empty($dbServer) || empty($dbUser) || empty($dbNameVal)) {
                Response::error('Firma veritabanı ayarları eksik', 'DB_CONFIG_MISSING', 400);
            }

            $dsn = "mysql:host={$dbServer};port={$dbPort};dbname={$dbNameVal};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            // Model kartının varlığını kontrol et
            $model = $pdo->prepare("SELECT id FROM model_kartlar WHERE id = ? AND firma_id = ? AND aktif = 1");
            $model->execute([(int)$modelId, $firmaId]);
            if (!$model->fetch()) {
                Response::error('Model kartı bulunamadı', 'MODEL_NOT_FOUND', 404);
            }

            // Domain bilgisi
            $url = $firmaAyarlar['url'] ?? [];
            $domain = $url['domain'] ?? '';
            if (empty($domain)) {
                Response::error('Firma domain bilgisi bulunamadı', 'DOMAIN_NOT_FOUND', 400);
            }

            // Dosya uzantısı
            $extMap = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
            $ext = $extMap[$mimeType] ?? 'jpg';

            // Rastgele dosya adı
            $fileName = bin2hex(random_bytes(32)) . '.' . $ext;

            // Upload dizini: /home/golakscom/public_html/{subdomain}/upload/{firma_id}/model_resim/
            $subdomain = explode('.', $domain)[0];
            $uploadDir = '/home/golakscom/public_html/' . $subdomain . '/upload/' . $firmaId . '/model_resim/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $filePath = $uploadDir . $fileName;
            $publicUrl = 'https://' . $domain . '/upload/' . $firmaId . '/model_resim/' . $fileName;

            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                Response::serverError('Dosya yüklenemedi');
            }

            // Resim optimizasyonu (GD ile sıkıştırma)
            $this->optimizeImage($filePath, $mimeType);

            // Optimizasyon sonrası gerçek boyutu al
            $file['size'] = filesize($filePath);

            // Renk bilgisi (opsiyonel)
            $renkId = !empty($_POST['renkId']) ? (int)$_POST['renkId'] : null;

            // Firma'nın varsayılan şubesini al
            $subeStmt = $pdo->prepare("SELECT id FROM subeler WHERE firma_id = ? AND aktif = 1 ORDER BY id ASC LIMIT 1");
            $subeStmt->execute([$firmaId]);
            $subeRow = $subeStmt->fetch();
            $subeId = $subeRow ? (int)$subeRow['id'] : 1;

            // dosyalar tablosuna kaydet
            $dosyaBoyutuMB = round($file['size'] / (1024 * 1024), 2);
            $insertSql = "INSERT INTO dosyalar (firma_id, sube_id, modul, modul_kayit_id, tanim_id, dosya_adi, dosya_yolu, dosya_tipi, dosya_boyutu, aciklama, kayit_tarihi, kullanici_kayit_id, kayit_ip, aktif)
                          VALUES (?, ?, 'model_kartlar', ?, ?, ?, ?, ?, ?, '', NOW(), ?, ?, 1)";
            $insertStmt = $pdo->prepare($insertSql);
            $insertStmt->execute([
                $firmaId,
                $subeId,
                (int)$modelId,
                $renkId ?? 0,
                $file['name'],
                $publicUrl,
                $ext,
                $dosyaBoyutuMB,
                $userId,
                $_SERVER['REMOTE_ADDR'] ?? ''
            ]);

            Response::success([
                'dosyaYolu' => $publicUrl,
                'dosyaAdi' => $file['name'],
                'dosyaTipi' => $ext,
                'renkId' => $renkId,
            ], 'Resim başarıyla yüklendi');

        } catch (PDOException $e) {
            Response::serverError('Veritabanı hatası: ' . $e->getMessage());
        } catch (Exception $e) {
            Response::serverError('Resim yüklenemedi: ' . $e->getMessage());
        }
    }

    /**
     * POST /model-kart/delete-image
     * Resim silme
     */
    public function deleteImage() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $dataName = $data['dataName'] ?? '';
        $imageId = (int)($data['imageId'] ?? 0);

        if (empty($dataName) || $imageId <= 0) {
            Response::error('dataName ve imageId gereklidir', 'VALIDATION_ERROR', 400);
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
            $dbNameVal = $veritabani['veriAdi'] ?? '';

            if (empty($dbServer) || empty($dbUser) || empty($dbNameVal)) {
                Response::error('Firma veritabanı ayarları eksik', 'DB_CONFIG_MISSING', 400);
            }

            $dsn = "mysql:host={$dbServer};port={$dbPort};dbname={$dbNameVal};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            // Dosya kaydını bul
            $stmt = $pdo->prepare("SELECT id, dosya_yolu FROM dosyalar WHERE id = ? AND firma_id = ? AND modul = 'model_kartlar' AND aktif = 1");
            $stmt->execute([$imageId, $firmaId]);
            $dosya = $stmt->fetch();

            if (!$dosya) {
                Response::error('Resim bulunamadı', 'IMAGE_NOT_FOUND', 404);
            }

            // Dosyayı diskten sil
            $url = $firmaAyarlar['url'] ?? [];
            $domain = $url['domain'] ?? '';
            if ($domain) {
                $subdomain = explode('.', $domain)[0];
                // URL'den dosya adını çıkar
                $fileName = basename($dosya['dosya_yolu']);
                $filePath = '/home/golakscom/public_html/' . $subdomain . '/upload/' . $firmaId . '/model_resim/' . $fileName;
                if (file_exists($filePath)) {
                    unlink($filePath);
                }
            }

            // Veritabanından pasife çek
            $updateStmt = $pdo->prepare("UPDATE dosyalar SET aktif = -1 WHERE id = ?");
            $updateStmt->execute([$imageId]);

            Response::success(null, 'Resim başarıyla silindi');

        } catch (PDOException $e) {
            Response::serverError('Veritabanı hatası: ' . $e->getMessage());
        } catch (Exception $e) {
            Response::serverError('Resim silinemedi: ' . $e->getMessage());
        }
    }

    /**
     * POST /model-kart/colors
     * Renk listesi (tanimlar tablosundan)
     */
    public function getColors() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];
        $dataName = $data['dataName'] ?? '';

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
            $dbNameVal = $veritabani['veriAdi'] ?? '';

            if (empty($dbServer) || empty($dbUser) || empty($dbNameVal)) {
                Response::error('Firma veritabanı ayarları eksik', 'DB_CONFIG_MISSING', 400);
            }

            $dsn = "mysql:host={$dbServer};port={$dbPort};dbname={$dbNameVal};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            // Önce renk_kodu kolonunun var olup olmadığını kontrol et
            $colCheck = $pdo->query("SHOW COLUMNS FROM tanimlar LIKE 'renk_kodu'");
            $hasRenkKodu = $colCheck->rowCount() > 0;

            $selectFields = $hasRenkKodu ? 'id, tanim_deger, renk_kodu' : 'id, tanim_deger';
            $sql = "SELECT {$selectFields} FROM tanimlar WHERE tanim_kodu = 'RENK' AND firma_id = ? AND aktif = 1 ORDER BY tanim_deger ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$firmaId]);
            $rows = $stmt->fetchAll();

            $colors = [];
            foreach ($rows as $row) {
                $colors[] = [
                    'id' => (int)$row['id'],
                    'name' => $row['tanim_deger'],
                    'code' => $hasRenkKodu ? ($row['renk_kodu'] ?? null) : null,
                ];
            }

            Response::success([
                'data' => $colors,
                'count' => count($colors),
            ]);

        } catch (PDOException $e) {
            Response::serverError('Veritabanı hatası: ' . $e->getMessage());
        } catch (Exception $e) {
            Response::serverError('Renkler alınamadı: ' . $e->getMessage());
        }
    }

    /**
     * POST /model-kart/create
     * Yeni model kartı oluştur
     */
    public function create() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $dataName = $data['dataName'] ?? '';
        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }

        // Zorunlu alanlar
        $modelAdi = trim($data['modelAdi'] ?? '');
        $barkodTipi = $data['barkodTipi'] ?? 'tekil';
        $anaModelId = (int)($data['anaModelId'] ?? 0);

        if (empty($modelAdi)) {
            Response::error('Model adı zorunludur', 'VALIDATION_ERROR', 400);
        }
        if (empty($anaModelId)) {
            Response::error('Ana model zorunludur', 'VALIDATION_ERROR', 400);
        }
        if (!in_array($barkodTipi, ['tekil', 'seri', 'cogul'])) {
            Response::error('Geçersiz barkod tipi', 'VALIDATION_ERROR', 400);
        }

        // Opsiyonel alanlar
        $modelTipiId = (int)($data['modelTipiId'] ?? 0);
        $cinsiyetId = (int)($data['cinsiyetId'] ?? 0);
        $sezonId = (int)($data['sezonId'] ?? 0);
        $tarzId = (int)($data['tarzId'] ?? 0);
        $marka = trim($data['marka'] ?? '');
        $modelist = trim($data['modelist'] ?? '');
        $tasarimci = trim($data['tasarimci'] ?? '');
        $boy = trim($data['boy'] ?? '');
        $bedenSetleriId = (int)($data['bedenSetleriId'] ?? 0);
        $bazBeden = trim($data['bazBeden'] ?? '');
        $setParca = (int)($data['setParca'] ?? 0);
        $setIcerik = trim($data['setIcerik'] ?? '');
        $katsayi = isset($data['katsayi']) && $data['katsayi'] !== '' ? (float)$data['katsayi'] : null;
        $aciklama = trim($data['aciklama'] ?? '');

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
            $dbNameVal = $veritabani['veriAdi'] ?? '';

            if (empty($dbServer) || empty($dbUser) || empty($dbNameVal)) {
                Response::error('Firma veritabanı ayarları eksik', 'DB_CONFIG_MISSING', 400);
            }

            $dsn = "mysql:host={$dbServer};port={$dbPort};dbname={$dbNameVal};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            $sql = "INSERT INTO model_kartlar (
                firma_id, ana_model_id, model_adi, barkod_tipi, model_tipi_id,
                cinsiyet_id, sezon_id, tarz_id, marka, modelist, tasarimci,
                boy, beden_setleri_id, baz_beden, set_parca, set_icerik,
                katsayi, aciklama, kayit_kullanici_id, kayit_ip, aktif
            ) VALUES (
                :firmaId, :anaModelId, :modelAdi, :barkodTipi, :modelTipiId,
                :cinsiyetId, :sezonId, :tarzId, :marka, :modelist, :tasarimci,
                :boy, :bedenSetleriId, :bazBeden, :setParca, :setIcerik,
                :katsayi, :aciklama, :kullaniciId, :ip, 1
            )";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':firmaId' => $firmaId,
                ':anaModelId' => $anaModelId,
                ':modelAdi' => $modelAdi,
                ':barkodTipi' => $barkodTipi,
                ':modelTipiId' => $modelTipiId,
                ':cinsiyetId' => $cinsiyetId,
                ':sezonId' => $sezonId,
                ':tarzId' => $tarzId,
                ':marka' => $marka,
                ':modelist' => $modelist,
                ':tasarimci' => $tasarimci,
                ':boy' => $boy,
                ':bedenSetleriId' => $bedenSetleriId,
                ':bazBeden' => $bazBeden,
                ':setParca' => $setParca,
                ':setIcerik' => $setIcerik,
                ':katsayi' => $katsayi,
                ':aciklama' => $aciklama,
                ':kullaniciId' => $userId,
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? '',
            ]);

            $newId = (int)$pdo->lastInsertId();

            Response::success(['id' => $newId], 'Model kartı başarıyla oluşturuldu');

        } catch (PDOException $e) {
            Response::serverError('Veritabanı hatası: ' . $e->getMessage());
        } catch (Exception $e) {
            Response::serverError('Model kartı oluşturulamadı: ' . $e->getMessage());
        }
    }

    /**
     * POST /model-kart/update
     * Model kartı güncelle
     */
    public function update() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $dataName = $data['dataName'] ?? '';
        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }

        $modelId = (int)($data['id'] ?? 0);
        if (empty($modelId)) {
            Response::error('Model ID zorunludur', 'VALIDATION_ERROR', 400);
        }

        $modelAdi = trim($data['modelAdi'] ?? '');
        $barkodTipi = $data['barkodTipi'] ?? 'tekil';
        $anaModelId = (int)($data['anaModelId'] ?? 0);

        if (empty($modelAdi)) {
            Response::error('Model adı zorunludur', 'VALIDATION_ERROR', 400);
        }
        if (empty($anaModelId)) {
            Response::error('Ana model zorunludur', 'VALIDATION_ERROR', 400);
        }
        if (!in_array($barkodTipi, ['tekil', 'seri', 'cogul'])) {
            Response::error('Geçersiz barkod tipi', 'VALIDATION_ERROR', 400);
        }

        $modelTipiId = (int)($data['modelTipiId'] ?? 0);
        $cinsiyetId = (int)($data['cinsiyetId'] ?? 0);
        $sezonId = (int)($data['sezonId'] ?? 0);
        $tarzId = (int)($data['tarzId'] ?? 0);
        $marka = trim($data['marka'] ?? '');
        $modelist = trim($data['modelist'] ?? '');
        $tasarimci = trim($data['tasarimci'] ?? '');
        $boy = trim($data['boy'] ?? '');
        $bedenSetleriId = (int)($data['bedenSetleriId'] ?? 0);
        $bazBeden = trim($data['bazBeden'] ?? '');
        $setParca = (int)($data['setParca'] ?? 0);
        $setIcerik = trim($data['setIcerik'] ?? '');
        $aciklama = trim($data['aciklama'] ?? '');

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
            $dbNameVal = $veritabani['veriAdi'] ?? '';

            if (empty($dbServer) || empty($dbUser) || empty($dbNameVal)) {
                Response::error('Firma veritabanı ayarları eksik', 'DB_CONFIG_MISSING', 400);
            }

            $dsn = "mysql:host={$dbServer};port={$dbPort};dbname={$dbNameVal};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            $sql = "UPDATE model_kartlar SET
                ana_model_id = :anaModelId,
                model_adi = :modelAdi,
                barkod_tipi = :barkodTipi,
                model_tipi_id = :modelTipiId,
                cinsiyet_id = :cinsiyetId,
                sezon_id = :sezonId,
                tarz_id = :tarzId,
                marka = :marka,
                modelist = :modelist,
                tasarimci = :tasarimci,
                boy = :boy,
                beden_setleri_id = :bedenSetleriId,
                baz_beden = :bazBeden,
                set_parca = :setParca,
                set_icerik = :setIcerik,
                aciklama = :aciklama
            WHERE id = :id AND firma_id = :firmaId";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':anaModelId' => $anaModelId,
                ':modelAdi' => $modelAdi,
                ':barkodTipi' => $barkodTipi,
                ':modelTipiId' => $modelTipiId,
                ':cinsiyetId' => $cinsiyetId,
                ':sezonId' => $sezonId,
                ':tarzId' => $tarzId,
                ':marka' => $marka,
                ':modelist' => $modelist,
                ':tasarimci' => $tasarimci,
                ':boy' => $boy,
                ':bedenSetleriId' => $bedenSetleriId,
                ':bazBeden' => $bazBeden,
                ':setParca' => $setParca,
                ':setIcerik' => $setIcerik,
                ':aciklama' => $aciklama,
                ':id' => $modelId,
                ':firmaId' => $firmaId,
            ]);

            Response::success(['id' => $modelId], 'Model kartı başarıyla güncellendi');

        } catch (PDOException $e) {
            Response::serverError('Veritabanı hatası: ' . $e->getMessage());
        } catch (Exception $e) {
            Response::serverError('Model kartı güncellenemedi: ' . $e->getMessage());
        }
    }

    /**
     * Resmi GD ile optimize et (boyut küçültme + sıkıştırma)
     */
    private function optimizeImage(string $filePath, string $mimeType): void {
        if (!extension_loaded('gd')) return;

        $maxWidth = 1200;
        $maxHeight = 1200;
        $jpegQuality = 70;

        $source = null;
        switch ($mimeType) {
            case 'image/jpeg':
                $source = @imagecreatefromjpeg($filePath);
                break;
            case 'image/png':
                $source = @imagecreatefrompng($filePath);
                break;
            case 'image/webp':
                $source = @imagecreatefromwebp($filePath);
                break;
        }

        if (!$source) return;

        $origWidth = imagesx($source);
        $origHeight = imagesy($source);

        // Boyut hesapla
        $ratio = min($maxWidth / $origWidth, $maxHeight / $origHeight, 1.0);
        $newWidth = (int)round($origWidth * $ratio);
        $newHeight = (int)round($origHeight * $ratio);

        // Yeniden boyutlandır
        $resized = imagecreatetruecolor($newWidth, $newHeight);

        // PNG/WebP transparency desteği
        if ($mimeType === 'image/png' || $mimeType === 'image/webp') {
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
        }

        imagecopyresampled($resized, $source, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);
        imagedestroy($source);

        // Her zaman JPEG olarak kaydet (en küçük boyut)
        imagejpeg($resized, $filePath, $jpegQuality);
        imagedestroy($resized);
    }
}
