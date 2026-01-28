<?php
/**
 * AI Server Load Balancer
 * Selects best available AI server based on load, response time, and success rate
 */

class AILoadBalancer
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Get best available AI server
     * @param array $excludeServerIds Server IDs to exclude
     * @return array|null Server data or null if no server available
     */
    public function getBestServer($excludeServerIds = [])
    {
        try {
            $excludeClause = '';
            $params = [];

            if (!empty($excludeServerIds)) {
                $placeholders = str_repeat('?,', count($excludeServerIds) - 1) . '?';
                $excludeClause = " AND sunucu_id NOT IN ($placeholders)";
                $params = $excludeServerIds;
            }

            // Get active servers with available capacity
            $sql = "SELECT * FROM ai_sunucular
                    WHERE sunucu_durumu = 'aktif'
                    AND mevcut_yuk < maksimum_yuk
                    AND (toplam_istek_sayisi < 5 OR basari_orani >= 30.0)
                    $excludeClause
                    ORDER BY
                        basari_orani DESC,
                        (mevcut_yuk / maksimum_yuk) ASC,
                        ort_yanit_suresi ASC
                    LIMIT 1";

            $server = $this->db->fetchOne($sql, $params);

            if (!$server) {
                return null;
            }

            return $server;

        } catch (Exception $e) {
            error_log("AILoadBalancer getBestServer error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Increment server load before request
     * @param int $serverId
     * @return bool Success
     */
    public function incrementServerLoad($serverId)
    {
        try {
            $this->db->query(
                "UPDATE ai_sunucular
                 SET mevcut_yuk = mevcut_yuk + 1,
                     son_kullanilma_tarihi = NOW()
                 WHERE sunucu_id = ?",
                [$serverId]
            );
            return true;
        } catch (Exception $e) {
            error_log("AILoadBalancer incrementServerLoad error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Decrement server load and update statistics after request
     * @param int $serverId
     * @param int $responseTime Response time in milliseconds
     * @param bool $success Whether request was successful
     * @return bool Success
     */
    public function decrementServerLoad($serverId, $responseTime, $success)
    {
        try {
            // Get current stats
            $server = $this->db->fetchOne(
                "SELECT toplam_istek_sayisi, basarili_istek_sayisi, ort_yanit_suresi FROM ai_sunucular WHERE sunucu_id = ?",
                [$serverId]
            );

            if (!$server) {
                return false;
            }

            $newTotalRequests = $server['toplam_istek_sayisi'] + 1;
            $newSuccessfulRequests = $success ? $server['basarili_istek_sayisi'] + 1 : $server['basarili_istek_sayisi'];
            $newFailedRequests = $newTotalRequests - $newSuccessfulRequests;
            $newSuccessRate = ($newSuccessfulRequests / $newTotalRequests) * 100;

            // Calculate new average response time
            $oldAvg = $server['ort_yanit_suresi'];
            $oldTotal = $server['toplam_istek_sayisi'];

            if ($success && $responseTime > 0) {
                $newAvg = (($oldAvg * $oldTotal) + $responseTime) / $newTotalRequests;
            } else {
                $newAvg = $oldAvg;
            }

            // Update server stats
            $this->db->query(
                "UPDATE ai_sunucular
                 SET mevcut_yuk = GREATEST(0, mevcut_yuk - 1),
                     toplam_istek_sayisi = ?,
                     basarili_istek_sayisi = ?,
                     basarisiz_istek_sayisi = ?,
                     basari_orani = ?,
                     ort_yanit_suresi = ?,
                     son_yanit_suresi = ?,
                     guncelleme_tarihi = NOW()
                 WHERE sunucu_id = ?",
                [
                    $newTotalRequests,
                    $newSuccessfulRequests,
                    $newFailedRequests,
                    round($newSuccessRate, 2),
                    round($newAvg),
                    $responseTime,
                    $serverId
                ]
            );

            // Auto-disable server if success rate is too low (< 20% after minimum 5 requests)
            if ($newTotalRequests >= 5 && $newSuccessRate < 20) {
                $this->db->query(
                    "UPDATE ai_sunucular SET sunucu_durumu = 'bakim' WHERE sunucu_id = ?",
                    [$serverId]
                );
                error_log("AI Server $serverId auto-disabled due to low success rate: " . round($newSuccessRate, 2) . "%");
            }

            return true;

        } catch (Exception $e) {
            error_log("AILoadBalancer decrementServerLoad error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get all active servers health status
     * @return array
     */
    public function getServerHealth()
    {
        try {
            $servers = $this->db->fetchAll(
                "SELECT sunucu_id, sunucu_adi, sunucu_durumu, mevcut_yuk, maksimum_yuk,
                        basari_orani, ort_yanit_suresi, toplam_istek_sayisi,
                        basarili_istek_sayisi, son_kullanilma_tarihi
                 FROM ai_sunucular
                 ORDER BY sunucu_durumu DESC, basari_orani DESC"
            );

            return $servers ?: [];

        } catch (Exception $e) {
            error_log("AILoadBalancer getServerHealth error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Send request to AI server
     * @param array $server Server data
     * @param array $messages Conversation messages
     * @return array Response with 'success', 'data', 'response_time'
     */
    public function sendRequest($server, $messages)
    {
        $serverType = $server['sunucu_tipi'] ?? 'openai';

        switch ($serverType) {
            case 'claude':
                return $this->sendClaudeRequest($server, $messages);
            case 'golaks':
            case 'ollama':
                return $this->sendOllamaRequest($server, $messages);
            case 'groq':
            case 'openai':
            default:
                return $this->sendOpenAIRequest($server, $messages);
        }
    }

    /**
     * Send request to OpenAI/Groq compatible API
     */
    private function sendOpenAIRequest($server, $messages)
    {
        $startTime = microtime(true);

        try {
            $serverUrl = rtrim($server['sunucu_ip'], '/');
            $apiKey = $server['sunucu_api_anahtari'] ?? '';

            $postData = [
                'model' => $server['sunucu_modeli'],
                'messages' => $messages,
                'stream' => false
            ];

            $ch = curl_init($serverUrl);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    $apiKey ? "Authorization: Bearer {$apiKey}" : ''
                ],
                CURLOPT_POSTFIELDS => json_encode($postData),
                CURLOPT_TIMEOUT => 30,
                CURLOPT_CONNECTTIMEOUT => 5
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            $responseTime = round((microtime(true) - $startTime) * 1000);

            if ($curlError) {
                return ['success' => false, 'error' => $curlError, 'response_time' => $responseTime];
            }

            if ($httpCode !== 200) {
                return ['success' => false, 'error' => "HTTP $httpCode", 'response_time' => $responseTime];
            }

            $result = json_decode($response, true);
            if (!$result) {
                return ['success' => false, 'error' => 'Invalid JSON response', 'response_time' => $responseTime];
            }

            $content = $result['choices'][0]['message']['content'] ?? null;
            if (!$content) {
                return ['success' => false, 'error' => 'No content in response', 'response_time' => $responseTime];
            }

            return $this->formatSuccessResponse($content, $responseTime);

        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage(), 'response_time' => round((microtime(true) - $startTime) * 1000)];
        }
    }

    /**
     * Send request to Claude (Anthropic) API
     */
    private function sendClaudeRequest($server, $messages)
    {
        $startTime = microtime(true);

        try {
            $serverUrl = rtrim($server['sunucu_ip'], '/');
            $apiKey = $server['sunucu_api_anahtari'] ?? '';

            // Claude API: system prompt ayrı, messages farklı format
            $systemPrompt = '';
            $claudeMessages = [];

            foreach ($messages as $msg) {
                if ($msg['role'] === 'system') {
                    $systemPrompt = $msg['content'];
                } else {
                    $claudeMessages[] = [
                        'role' => $msg['role'],
                        'content' => $msg['content']
                    ];
                }
            }

            $postData = [
                'model' => $server['sunucu_modeli'],
                'max_tokens' => 4096,
                'messages' => $claudeMessages
            ];

            if (!empty($systemPrompt)) {
                $postData['system'] = $systemPrompt;
            }

            $ch = curl_init($serverUrl);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'x-api-key: ' . $apiKey,
                    'anthropic-version: 2023-06-01'
                ],
                CURLOPT_POSTFIELDS => json_encode($postData),
                CURLOPT_TIMEOUT => 30,
                CURLOPT_CONNECTTIMEOUT => 5
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            $responseTime = round((microtime(true) - $startTime) * 1000);

            if ($curlError) {
                return ['success' => false, 'error' => $curlError, 'response_time' => $responseTime];
            }

            if ($httpCode !== 200) {
                $errorBody = json_decode($response, true);
                $errorMsg = $errorBody['error']['message'] ?? "HTTP $httpCode";
                return ['success' => false, 'error' => $errorMsg, 'response_time' => $responseTime];
            }

            $result = json_decode($response, true);
            if (!$result) {
                return ['success' => false, 'error' => 'Invalid JSON response', 'response_time' => $responseTime];
            }

            // Claude response format: content[0].text
            $content = $result['content'][0]['text'] ?? null;
            if (!$content) {
                return ['success' => false, 'error' => 'No content in response', 'response_time' => $responseTime];
            }

            return $this->formatSuccessResponse($content, $responseTime);

        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage(), 'response_time' => round((microtime(true) - $startTime) * 1000)];
        }
    }

    /**
     * Send request to Ollama API
     */
    private function sendOllamaRequest($server, $messages)
    {
        $startTime = microtime(true);

        try {
            $serverUrl = rtrim($server['sunucu_ip'], '/');

            $postData = [
                'model' => $server['sunucu_modeli'],
                'messages' => $messages,
                'stream' => false
            ];

            $ch = curl_init($serverUrl);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                CURLOPT_POSTFIELDS => json_encode($postData),
                CURLOPT_TIMEOUT => 30,
                CURLOPT_CONNECTTIMEOUT => 5
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            $responseTime = round((microtime(true) - $startTime) * 1000);

            if ($curlError) {
                return ['success' => false, 'error' => $curlError, 'response_time' => $responseTime];
            }

            if ($httpCode !== 200) {
                return ['success' => false, 'error' => "HTTP $httpCode", 'response_time' => $responseTime];
            }

            $result = json_decode($response, true);
            if (!$result) {
                return ['success' => false, 'error' => 'Invalid JSON response', 'response_time' => $responseTime];
            }

            // Ollama response format: message.content
            $content = $result['message']['content'] ?? $result['response'] ?? null;
            if (!$content) {
                return ['success' => false, 'error' => 'No content in response', 'response_time' => $responseTime];
            }

            return $this->formatSuccessResponse($content, $responseTime);

        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage(), 'response_time' => round((microtime(true) - $startTime) * 1000)];
        }
    }

    /**
     * Format success response in standard format
     */
    private function formatSuccessResponse($content, $responseTime)
    {
        return [
            'success' => true,
            'data' => [
                'choices' => [
                    ['message' => ['content' => $content]]
                ]
            ],
            'response_time' => $responseTime
        ];
    }
}
