<?php
/**
 * Notification Controller
 * Handles notification operations
 */

class NotificationController {
    /**
     * Get all notifications for the authenticated user
     */
    public function getNotifications() {
        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        try {
            $db = Database::getInstance();

            // Filter parameter: 'unread', 'read', 'all' (default: 'all')
            $filter = $_GET['filter'] ?? 'all';

            // Status filter
            if ($filter === 'unread') {
                $statusFilter = "mbl.durum = 'gonderildi'";
            } elseif ($filter === 'read') {
                $statusFilter = "mbl.durum = 'okundu'";
            } else {
                $statusFilter = "mbl.durum IN ('gonderildi', 'okundu')";
            }

            // Get notifications
            $notifications = $db->fetchAll(
                "SELECT
                    mb.id,
                    mb.baslik AS title,
                    mb.mesaj AS message,
                    mb.bildirim_tipi AS type,
                    mb.olusturma_tarihi AS created_at,
                    DATE_FORMAT(mb.olusturma_tarihi, '%d.%m.%Y %H:%i') as time,
                    mbl.durum AS status,
                    CASE WHEN mbl.durum = 'gonderildi' THEN 0 ELSE 1 END AS \`read\`
                FROM mobil_bildirim_log mbl
                INNER JOIN mobil_bildirim mb ON mbl.mobil_bildirim_id = mb.id
                WHERE mbl.mobil_kullanici_id = ?
                    AND {$statusFilter}
                ORDER BY mb.olusturma_tarihi DESC
                LIMIT 50",
                [$userId]
            );

            // Convert read to boolean
            foreach ($notifications as &$notification) {
                $notification['read'] = (bool)$notification['read'];
            }

            // Get unread count
            $unreadCount = $db->fetchOne(
                "SELECT COUNT(*) as count
                FROM mobil_bildirim_log
                WHERE mobil_kullanici_id = ? AND durum = 'gonderildi'",
                [$userId]
            );

            // Get read count
            $readCount = $db->fetchOne(
                "SELECT COUNT(*) as count
                FROM mobil_bildirim_log
                WHERE mobil_kullanici_id = ? AND durum = 'okundu'",
                [$userId]
            );

            Response::success([
                'data' => $notifications,
                'unread_count' => (int)$unreadCount['count'],
                'read_count' => (int)$readCount['count']
            ]);

        } catch (Exception $e) {
            error_log("Get notifications error: " . $e->getMessage());
            Response::serverError('Bildirimler yüklenemedi');
        }
    }

    /**
     * Get unread notifications
     */
    public function getUnreadNotifications() {
        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        try {
            $db = Database::getInstance();

            $notifications = $db->fetchAll(
                "SELECT
                    mb.id,
                    mb.baslik AS title,
                    mb.mesaj AS message,
                    mb.bildirim_tipi AS type,
                    mb.olusturma_tarihi AS created_at,
                    DATE_FORMAT(mb.olusturma_tarihi, '%d.%m.%Y %H:%i') as time,
                    mbl.durum AS status,
                    0 AS \`read\`
                FROM mobil_bildirim_log mbl
                INNER JOIN mobil_bildirim mb ON mbl.mobil_bildirim_id = mb.id
                WHERE mbl.mobil_kullanici_id = ? AND mbl.durum = 'gonderildi'
                ORDER BY mb.olusturma_tarihi DESC
                LIMIT 50",
                [$userId]
            );

            foreach ($notifications as &$notification) {
                $notification['read'] = false;
            }

            Response::success([
                'data' => $notifications,
                'unread_count' => count($notifications)
            ]);

        } catch (Exception $e) {
            error_log("Get unread notifications error: " . $e->getMessage());
            Response::serverError('Okunmamış bildirimler yüklenemedi');
        }
    }

    /**
     * Mark notification as read
     */
    public function markAsRead() {
        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        // Get notification ID from URI
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        preg_match('/\/notifications\/(\d+)\/read/', $path, $matches);
        $notificationId = $matches[1] ?? null;

        if (!$notificationId) {
            Response::badRequest('Geçersiz bildirim ID');
        }

        try {
            $db = Database::getInstance();

            $db->execute(
                "UPDATE mobil_bildirim_log
                SET durum = 'okundu', okunma_tarihi = NOW()
                WHERE mobil_bildirim_id = ? AND mobil_kullanici_id = ? AND durum = 'gonderildi'",
                [$notificationId, $userId]
            );

            Response::success([], 'Bildirim okundu olarak işaretlendi');

        } catch (Exception $e) {
            error_log("Mark as read error: " . $e->getMessage());
            Response::serverError('Bildirim güncellenemedi');
        }
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead() {
        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        try {
            $db = Database::getInstance();

            $db->execute(
                "UPDATE mobil_bildirim_log
                SET durum = 'okundu', okunma_tarihi = NOW()
                WHERE mobil_kullanici_id = ? AND durum = 'gonderildi'",
                [$userId]
            );

            Response::success([], 'Tüm bildirimler okundu olarak işaretlendi');

        } catch (Exception $e) {
            error_log("Mark all as read error: " . $e->getMessage());
            Response::serverError('Bildirimler güncellenemedi');
        }
    }

    /**
     * Send notification (superadmin only)
     */
    public function sendNotification() {
        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        try {
            $db = Database::getInstance();

            // Check if user is superadmin and get company ID
            $user = $db->fetchOne(
                "SELECT kullanici_rol, mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            if (!$user || $user['kullanici_rol'] != 2) {
                Response::forbidden('Bu işlem için yetkiniz bulunmamaktadır');
            }

            $firmaId = $user['mobil_firmalar_id'];

            $input = json_decode(file_get_contents('php://input'), true);

            $baslik = trim($input['baslik'] ?? '');
            $mesaj = trim($input['mesaj'] ?? '');
            $hedefTip = $input['hedef_tip'] ?? 'all';
            $hedefDeger = $input['hedef_deger'] ?? null;
            $bildirimTipi = $input['bildirim_tipi'] ?? 'genel';

            // Validation
            if (empty($baslik)) {
                Response::badRequest('Bildirim başlığı gereklidir');
            }

            if (strlen($baslik) > 255) {
                Response::badRequest('Başlık en fazla 255 karakter olabilir');
            }

            if (empty($mesaj)) {
                Response::badRequest('Bildirim mesajı gereklidir');
            }

            if (strlen($mesaj) > 1000) {
                Response::badRequest('Mesaj en fazla 1000 karakter olabilir');
            }

            $validHedefTipler = ['all', 'role', 'user'];
            if (!in_array($hedefTip, $validHedefTipler)) {
                Response::badRequest('Geçersiz hedef tipi');
            }

            $validBildirimTipler = ['bilgi', 'genel', 'duyuru', 'guncelleme', 'uyari', 'acil'];
            if (!in_array($bildirimTipi, $validBildirimTipler)) {
                Response::badRequest('Geçersiz bildirim tipi');
            }

            // Determine target users
            $hedefKullanicilar = [];

            if ($hedefTip === 'all') {
                // All active users (all companies)
                $hedefKullanicilar = $db->fetchAll(
                    "SELECT id FROM mobil_kullanici WHERE aktif = 1"
                );
            } elseif ($hedefTip === 'role') {
                // Users with specific role (all companies)
                if ($hedefDeger === null || !in_array((int)$hedefDeger, [0, 1, 2])) {
                    Response::badRequest('Geçerli bir rol seçmelisiniz');
                }
                $hedefKullanicilar = $db->fetchAll(
                    "SELECT id FROM mobil_kullanici WHERE aktif = 1 AND kullanici_rol = ?",
                    [(int)$hedefDeger]
                );
            } elseif ($hedefTip === 'user') {
                // Specific users (all companies)
                if (empty($hedefDeger)) {
                    Response::badRequest('En az bir kullanıcı seçmelisiniz');
                }

                $userIds = json_decode($hedefDeger, true);
                if (!is_array($userIds) || empty($userIds)) {
                    Response::badRequest('Geçersiz kullanıcı listesi');
                }

                $placeholders = implode(',', array_fill(0, count($userIds), '?'));
                $hedefKullanicilar = $db->fetchAll(
                    "SELECT id FROM mobil_kullanici WHERE aktif = 1 AND id IN ({$placeholders})",
                    $userIds
                );
            }

            $toplamHedef = count($hedefKullanicilar);

            if ($toplamHedef === 0) {
                Response::badRequest('Hedef kitlede kullanıcı bulunamadı');
            }

            // Begin transaction
            $db->beginTransaction();

            try {
                // Create main notification record
                $bildirimId = $db->insert('mobil_bildirim', [
                    'mobil_firmalar_id' => $firmaId,
                    'gonderen_id' => $userId,
                    'baslik' => $baslik,
                    'mesaj' => $mesaj,
                    'hedef_tip' => $hedefTip,
                    'hedef_deger' => $hedefDeger ?? '',
                    'bildirim_tipi' => $bildirimTipi,
                    'toplam_hedef' => $toplamHedef
                ]);

                // Set gonderim_tarihi immediately
                $db->execute(
                    "UPDATE mobil_bildirim SET gonderim_tarihi = NOW() WHERE id = ?",
                    [$bildirimId]
                );

                // Create notification log for each target user
                $basariliGonderim = 0;
                foreach ($hedefKullanicilar as $kullanici) {
                    try {
                        $logId = $db->insert('mobil_bildirim_log', [
                            'mobil_bildirim_id' => $bildirimId,
                            'mobil_kullanici_id' => $kullanici['id'],
                            'durum' => 'gonderildi'
                        ]);

                        // Set gonderim_tarihi immediately
                        $db->execute(
                            "UPDATE mobil_bildirim_log SET gonderim_tarihi = NOW() WHERE id = ?",
                            [$logId]
                        );
                        $basariliGonderim++;
                    } catch (Exception $e) {
                        error_log("Failed to send notification to user {$kullanici['id']}: " . $e->getMessage());
                    }
                }

                // Update main notification with statistics
                $basarisizGonderim = $toplamHedef - $basariliGonderim;
                $db->update('mobil_bildirim', [
                    'basarili_gonderim' => $basariliGonderim,
                    'basarisiz_gonderim' => $basarisizGonderim
                ], 'id = ?', [$bildirimId]);

                $db->commit();

                Response::success([
                    'bildirim_id' => $bildirimId,
                    'baslik' => $baslik,
                    'hedef_tip' => $hedefTip,
                    'bildirim_tipi' => $bildirimTipi,
                    'toplam_hedef' => $toplamHedef,
                    'basarili_gonderim' => $basariliGonderim,
                    'basarisiz_gonderim' => $basarisizGonderim
                ], "Bildirim {$basariliGonderim} kullanıcıya başarıyla gönderildi");

            } catch (Exception $e) {
                $db->rollback();
                throw $e;
            }

        } catch (Exception $e) {
            error_log("Send notification error: " . $e->getMessage());
            Response::serverError('Bildirim gönderilemedi: ' . $e->getMessage());
        }
    }

    /**
     * Delete notification
     */
    public function deleteNotification() {
        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        // Get notification ID from URI
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        preg_match('/\/notifications\/(\d+)$/', $path, $matches);
        $notificationId = $matches[1] ?? null;

        if (!$notificationId) {
            Response::badRequest('Geçersiz bildirim ID');
        }

        try {
            $db = Database::getInstance();

            $db->execute(
                "DELETE FROM mobil_bildirim_log
                WHERE mobil_bildirim_id = ? AND mobil_kullanici_id = ?",
                [$notificationId, $userId]
            );

            Response::success([], 'Bildirim silindi');

        } catch (Exception $e) {
            error_log("Delete notification error: " . $e->getMessage());
            Response::serverError('Bildirim silinemedi');
        }
    }
}
