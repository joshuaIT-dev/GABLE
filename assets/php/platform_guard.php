<?php
/*
|--------------------------------------------------------------------------
| platform_guard.php
|--------------------------------------------------------------------------
| Shared helpers for the Admin "Platform Settings".
|
| Settings are stored in the existing `system_settings` table:
|   platform_grade_boost_enabled      (default ON)
|   platform_battle_royale_enabled    (default ON)
|   platform_auto_grading_enabled     (default ON)
|   platform_maintenance_mode_enabled (default OFF)
|
| If a row is missing, the default above is used, so the site keeps
| behaving exactly as before until an Admin saves the settings.
|
| Usage in an endpoint:
|   require_once __DIR__ . '/platform_guard.php';
|--------------------------------------------------------------------------
*/

if (!function_exists('platform_defaults')) {

    /**
     * Make sure $_SESSION is available. Endpoints that only need to READ
     * the session (like the AI helpers) use read-only mode so a slow
     * request never locks the user's other requests.
     */
    function platform_ensure_session(bool $readOnly = false): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            if ($readOnly) {
                session_start(['read_and_close' => true]);
            } else {
                session_start();
            }
        }
    }

    function platform_defaults(): array
    {
        return [
            'platform_grade_boost_enabled'      => 1,
            'platform_battle_royale_enabled'    => 1,
            'platform_auto_grading_enabled'     => 1,
            'platform_maintenance_mode_enabled' => 0,
        ];
    }

    /**
     * Read all four platform settings. Missing rows fall back to defaults.
     */
    function platform_get_settings(mysqli $conn): array
    {
        $settings = platform_defaults();

        try {
            $result = $conn->query(
                "SELECT setting_key, setting_value FROM system_settings
                 WHERE setting_key IN (
                    'platform_grade_boost_enabled',
                    'platform_battle_royale_enabled',
                    'platform_auto_grading_enabled',
                    'platform_maintenance_mode_enabled'
                 )"
            );

            if ($result) {
                while ($row = $result->fetch_assoc()) {
                    $settings[$row['setting_key']] =
                        ((int)$row['setting_value'] === 1) ? 1 : 0;
                }
                $result->free();
            }
        } catch (Throwable $e) {
            // If the table cannot be read we keep the defaults, but we do
            // not hide the problem: it is written to the PHP error log.
            error_log('GABLE platform_get_settings failed: ' . $e->getMessage());
        }

        return $settings;
    }

    function platform_setting_enabled(mysqli $conn, string $key): bool
    {
        $settings = platform_get_settings($conn);
        return !empty($settings[$key]);
    }

    function platform_json_exit(int $httpCode, array $payload): void
    {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: no-store');
        }
        http_response_code($httpCode);
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }

    /**
     * Stop the request unless a valid Admin session exists.
     * Returns the admin id.
     */
    function platform_require_admin(): int
    {
        platform_ensure_session();

        $adminId = (int)($_SESSION['admin'] ?? 0);

        if ($adminId <= 0) {
            platform_json_exit(401, [
                'success' => false,
                'message' => 'Admin session required. Please log in as an Admin.'
            ]);
        }

        return $adminId;
    }

    /**
     * Normalises "Battle Royale", "battle_royale", "BATTLE-ROYALE" ...
     */
    function platform_is_battle_royale($quizType): bool
    {
        $normalised = preg_replace('/[^a-z]/', '', strtolower((string)$quizType));
        return $normalised === 'battleroyale';
    }

    function platform_maintenance_message(): string
    {
        return 'GABLE is temporarily unavailable for scheduled maintenance. '
             . 'Your data and submissions are safe. Please try again later.';
    }

    /**
     * Maintenance Mode for STUDENT requests.
     *
     * Call this after config.php is loaded, in every endpoint that a
     * student uses. It only affects requests that carry a student session;
     * Admin and Instructor requests are never blocked here.
     *
     * When maintenance is ON the student session is removed (so the
     * student is signed out) and a 503 JSON response is returned.
     */
    function platform_block_students_if_maintenance(?mysqli $conn = null): void
    {
        // The shared connection guard now gives every signed-in role the same grace period.
        if($conn)maintenance_enforce($conn);
        else {$connection=getConnection();$connection->close();}
    }

    /* ------------------------------------------------------------------
     * Battle Royale helpers (used by get_quiz.php)
     * ------------------------------------------------------------------ */

    function platform_battle_royale_blocked_response(): void
    {
        platform_json_exit(403, [
            'success'                => false,
            'battle_royale_disabled' => true,
            'message'                => 'Battle Royale Mode is currently disabled by the administrator.'
        ]);
    }

    /**
     * Creating a Battle Royale quiz (even as a draft) is not allowed
     * while Battle Royale Mode is OFF.
     */
    function platform_assert_battle_royale_create(string $quizType): void
    {
        if (!platform_is_battle_royale($quizType)) {
            return;
        }

        $conn = getConnection();
        $enabled = platform_setting_enabled($conn, 'platform_battle_royale_enabled');
        $conn->close();

        if (!$enabled) {
            platform_battle_royale_blocked_response();
        }
    }

    /**
     * Publishing (activating) an existing Battle Royale draft is blocked
     * while Battle Royale Mode is OFF. Other quiz types are never affected.
     */
    function platform_assert_battle_royale_publish(int $quizId, int $instructorId): void
    {
        $conn = getConnection();

        if (platform_setting_enabled($conn, 'platform_battle_royale_enabled')) {
            $conn->close();
            return;
        }

        $stmt = $conn->prepare(
            'SELECT quiz_type FROM quizzes WHERE quiz_id = ? AND instructor_id = ? LIMIT 1'
        );
        $stmt->bind_param('ii', $quizId, $instructorId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        $conn->close();

        if ($row && platform_is_battle_royale($row['quiz_type'])) {
            platform_battle_royale_blocked_response();
        }
    }

    /**
     * Editing quizzes while Battle Royale Mode is OFF:
     *  - changing a quiz INTO Battle Royale is blocked
     *  - activating a Battle Royale draft is blocked
     *  - editing an already-existing Battle Royale quiz without activating
     *    it stays allowed, so no existing data is locked or corrupted.
     */
    function platform_assert_battle_royale_update(
        int $quizId,
        int $instructorId,
        string $newType,
        string $newStatus
    ): void {
        if (!platform_is_battle_royale($newType)) {
            return;
        }

        $conn = getConnection();

        if (platform_setting_enabled($conn, 'platform_battle_royale_enabled')) {
            $conn->close();
            return;
        }

        $stmt = $conn->prepare(
            'SELECT quiz_type, status FROM quizzes WHERE quiz_id = ? AND instructor_id = ? LIMIT 1'
        );
        $stmt->bind_param('ii', $quizId, $instructorId);
        $stmt->execute();
        $old = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        $conn->close();

        if (!$old) {
            return; // get_quiz.php reports "not found" itself
        }

        $wasBattleRoyale = platform_is_battle_royale($old['quiz_type']);
        $isActivating    = ($old['status'] !== 'active' && $newStatus === 'active');

        if (!$wasBattleRoyale || $isActivating) {
            platform_battle_royale_blocked_response();
        }
    }
}
