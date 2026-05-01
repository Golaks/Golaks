<?php
/**
 * AI Controller
 * Handles AI Chat operations with load balancing
 */

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../includes/AILoadBalancer.php';
require_once __DIR__ . '/../includes/ChatSystemPrompts.php';

class AIController extends BaseController {

    /**
     * Send chat message to AI
     * POST /ai/chat
     */
    public function chat() {
        // Require authentication
        $user = $this->verifyToken();

        // Get request data
        $message = trim($this->requestData['message'] ?? '');
        $conversationHistory = $this->requestData['conversation_history'] ?? [];
        $language = $this->requestData['language'] ?? 'tr';

        // Validation
        if (empty($message)) {
            $this->sendError('Mesaj gerekli', 'VALIDATION_ERROR', 400);
        }

        if (strlen($message) > 2000) {
            $this->sendError('Mesaj çok uzun (max 2000 karakter)', 'VALIDATION_ERROR', 400);
        }

        // Validate language
        if (!in_array($language, ['tr', 'en'])) {
            $language = 'tr';
        }

        // Validate conversation history
        if (!is_array($conversationHistory)) {
            $conversationHistory = [];
        }

        // Limit conversation history (last 10 messages)
        $conversationHistory = array_slice($conversationHistory, -10);

        try {
            $loadBalancer = new AILoadBalancer();

            // Build messages array
            $messages = [];

            // Add system prompt
            $systemPrompt = ChatSystemPrompts::getPrompt($language);
            $messages[] = [
                'role' => 'system',
                'content' => $systemPrompt
            ];

            // Add conversation history
            foreach ($conversationHistory as $msg) {
                if (isset($msg['role']) && isset($msg['content'])) {
                    $messages[] = [
                        'role' => $msg['role'],
                        'content' => $msg['content']
                    ];
                }
            }

            // Add user message
            $messages[] = [
                'role' => 'user',
                'content' => $message
            ];

            // Try to get response from AI servers
            $maxRetries = 3;
            $excludeServerIds = [];
            $aiResponse = null;
            $usedServer = null;
            $finalRetryCount = 0;
            $finalResponseTime = 0;
            $finalSuccess = false;

            for ($retry = 0; $retry < $maxRetries; $retry++) {
                // Get best available server
                $server = $loadBalancer->getBestServer($excludeServerIds);

                if (!$server) {
                    $this->sendError('Şu anda AI servisleri kullanılamıyor', 'NO_SERVER_AVAILABLE', 503);
                }

                // Increment server load
                $loadBalancer->incrementServerLoad($server['sunucu_id']);

                // Send request
                $result = $loadBalancer->sendRequest($server, $messages);

                // Debug log
                error_log("AI Request to server {$server['sunucu_adi']}: " . json_encode($result));

                // Update server statistics
                $loadBalancer->decrementServerLoad(
                    $server['sunucu_id'],
                    $result['response_time'],
                    $result['success']
                );

                if ($result['success']) {
                    $aiResponse = $result['data']['choices'][0]['message']['content'];
                    $usedServer = $server;
                    $finalRetryCount = $retry;
                    $finalResponseTime = $result['response_time'];
                    $finalSuccess = true;
                    break;
                }

                // Add server to exclude list for next retry
                $excludeServerIds[] = $server['sunucu_id'];

                // If last retry, save failed attempt
                if ($retry === $maxRetries - 1) {
                    $usedServer = $server;
                    $finalRetryCount = $retry;
                    $finalResponseTime = $result['response_time'];
                    $finalSuccess = false;
                }
            }

            // Save conversation to database with detailed server info
            $db = Database::getInstance();
            $db->query(
                "INSERT INTO ai_konusmalar
                 (user_id, mesaj, yanit, dil, server_id, server_name, model, response_time, retry_count, success, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                [
                    $user['user_id'],
                    $message,
                    $aiResponse ?? '',
                    $language,
                    $usedServer['sunucu_id'] ?? null,
                    $usedServer['sunucu_adi'] ?? null,
                    $usedServer['sunucu_modeli'] ?? null,
                    $finalResponseTime,
                    $finalRetryCount,
                    $finalSuccess ? 1 : 0
                ]
            );

            // If all retries failed, return error
            if (!$finalSuccess) {
                $this->sendError(
                    'AI yanıt alınamadı: Tüm sunucular kullanılamıyor',
                    'AI_ERROR',
                    500
                );
            }

            // Return successful response
            $this->sendSuccess([
                'message' => $aiResponse,
                'language' => $language,
                'server_name' => $usedServer['sunucu_adi'] ?? null
            ], 'Yanıt alındı');

        } catch (Exception $e) {
            error_log("AI Chat error: " . $e->getMessage());
            $this->sendError('Chat işlemi başarısız: ' . $e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * Get AI server health status
     * GET /ai/health
     */
    public function health() {
        // Require authentication
        $this->verifyToken();

        try {
            $loadBalancer = new AILoadBalancer();
            $servers = $loadBalancer->getServerHealth();

            // Calculate overall statistics
            $stats = [
                'total_servers' => count($servers),
                'active_servers' => 0,
                'total_load' => 0,
                'total_capacity' => 0,
                'avg_success_rate' => 0,
                'avg_response_time' => 0
            ];

            $totalSuccessRate = 0;
            $totalResponseTime = 0;
            $activeCount = 0;

            foreach ($servers as $server) {
                if ($server['sunucu_durumu'] === 'aktif') {
                    $stats['active_servers']++;
                    $activeCount++;
                    $totalSuccessRate += $server['basari_orani'];
                    $totalResponseTime += $server['ort_yanit_suresi'];
                }
                $stats['total_load'] += $server['mevcut_yuk'];
                $stats['total_capacity'] += $server['maksimum_yuk'];
            }

            if ($activeCount > 0) {
                $stats['avg_success_rate'] = round($totalSuccessRate / $activeCount, 2);
                $stats['avg_response_time'] = round($totalResponseTime / $activeCount, 2);
            }

            $stats['capacity_usage'] = $stats['total_capacity'] > 0
                ? round(($stats['total_load'] / $stats['total_capacity']) * 100, 2)
                : 0;

            $this->sendSuccess([
                'stats' => $stats,
                'servers' => $servers
            ], 'Server health retrieved');

        } catch (Exception $e) {
            error_log("AI Server Health error: " . $e->getMessage());
            $this->sendError('Server health check failed', 'SERVER_ERROR', 500);
        }
    }
}
