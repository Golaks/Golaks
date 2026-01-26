<?php
/**
 * JSON Response Helper
 */

class Response {
    public static function json($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function success($data = null, $message = null) {
        $response = ['success' => true];

        if ($message !== null) {
            $response['message'] = $message;
        }

        if ($data !== null) {
            $response['data'] = $data;
        }

        self::json($response);
    }

    public static function error($message, $code = 'ERROR', $statusCode = 400, $data = null) {
        $response = [
            'success' => false,
            'error' => [
                'code' => $code,
                'message' => $message
            ]
        ];

        if ($data !== null) {
            $response['data'] = $data;
        }

        self::json($response, $statusCode);
    }

    public static function unauthorized($message = 'Unauthorized') {
        self::error($message, 'UNAUTHORIZED', 401);
    }

    public static function forbidden($message = 'Forbidden') {
        self::error($message, 'FORBIDDEN', 403);
    }

    public static function notFound($message = 'Not found') {
        self::error($message, 'NOT_FOUND', 404);
    }

    public static function serverError($message = 'Internal server error') {
        self::error($message, 'SERVER_ERROR', 500);
    }
}
