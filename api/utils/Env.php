<?php
/**
 * Environment Configuration Loader
 * Loads and manages .env file
 */

class Env {
    private static $loaded = false;
    private static $vars = [];

    /**
     * Load .env file
     */
    public static function load($path = null) {
        if (self::$loaded) {
            return;
        }

        if ($path === null) {
            $path = dirname(__DIR__) . '/.env';
        }

        if (!file_exists($path)) {
            throw new Exception(".env file not found: " . $path);
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        foreach ($lines as $line) {
            // Skip comments
            if (strpos(trim($line), '#') === 0) {
                continue;
            }

            // Parse line
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);

                // Remove quotes if present
                if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
                    (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
                    $value = substr($value, 1, -1);
                }

                // Store in both static array and $_ENV
                self::$vars[$key] = $value;
                $_ENV[$key] = $value;
                putenv("$key=$value");
            }
        }

        self::$loaded = true;
    }

    /**
     * Get environment variable
     * @param string $key Variable name
     * @param mixed $default Default value if not found
     * @return mixed
     */
    public static function get($key, $default = null) {
        if (!self::$loaded) {
            self::load();
        }

        if (isset(self::$vars[$key])) {
            return self::$vars[$key];
        }

        if (isset($_ENV[$key])) {
            return $_ENV[$key];
        }

        $value = getenv($key);
        if ($value !== false) {
            return $value;
        }

        return $default;
    }

    /**
     * Get environment variable as boolean
     */
    public static function getBool($key, $default = false) {
        $value = self::get($key, $default);

        if (is_bool($value)) {
            return $value;
        }

        return in_array(strtolower($value), ['true', '1', 'yes', 'on']);
    }

    /**
     * Get environment variable as integer
     */
    public static function getInt($key, $default = 0) {
        return (int) self::get($key, $default);
    }

    /**
     * Check if environment variable exists
     */
    public static function has($key) {
        return self::get($key) !== null;
    }

    /**
     * Get all environment variables
     */
    public static function all() {
        if (!self::$loaded) {
            self::load();
        }
        return self::$vars;
    }

    /**
     * Check if running in production
     */
    public static function isProduction() {
        return self::get('APP_ENV') === 'production';
    }

    /**
     * Check if running in development
     */
    public static function isDevelopment() {
        return self::get('APP_ENV') === 'development';
    }

    /**
     * Check if debug mode is enabled
     */
    public static function isDebug() {
        return self::getBool('APP_DEBUG', false);
    }
}
