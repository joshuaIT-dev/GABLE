<?php
/*
|--------------------------------------------------------------------------
| admin_platform_settings.php
|--------------------------------------------------------------------------
| GET  -> returns the four Platform Settings (Admin only)
| POST -> saves them (Admin only, JSON body, allow-listed keys only)
|
| Reuses the existing `system_settings` table. The XP rule settings are
| handled by admin_xp_settings.php and are not touched here.
|--------------------------------------------------------------------------
*/

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/platform_guard.php';

$adminId = platform_require_admin();

$allowed = array_keys(platform_defaults());

try {
    $conn = getConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode([
            'success'  => true,
            'settings' => platform_get_settings($conn)
        ]);
        $conn->close();
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        platform_json_exit(405, [
            'success' => false,
            'message' => 'Method not allowed.'
        ]);
    }

    // A cross-site HTML form cannot send application/json, so this blocks
    // simple cross-site request forgery attempts.
    $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
    if (strpos($contentType, 'application/json') === false) {
        platform_json_exit(415, [
            'success' => false,
            'message' => 'Content-Type must be application/json.'
        ]);
    }

    $payload = json_decode(file_get_contents('php://input'), true);

    if (!is_array($payload)
        || !isset($payload['settings'])
        || !is_array($payload['settings'])
        || count($payload['settings']) === 0) {
        platform_json_exit(400, [
            'success' => false,
            'message' => 'Invalid settings payload.'
        ]);
    }

    $toSave = [];

    foreach ($payload['settings'] as $key => $value) {
        if (!in_array($key, $allowed, true)) {
            platform_json_exit(400, [
                'success' => false,
                'message' => 'Unknown setting: ' . preg_replace('/[^a-z0-9_]/i', '', (string)$key)
            ]);
        }

        if (!in_array($value, [0, 1, '0', '1', true, false], true)) {
            platform_json_exit(400, [
                'success' => false,
                'message' => 'Setting values must be 0 or 1.'
            ]);
        }

        $toSave[$key] = ($value === 1 || $value === '1' || $value === true) ? 1 : 0;
    }

    $stmt = $conn->prepare(
        "INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
            setting_value = VALUES(setting_value),
            updated_by    = VALUES(updated_by),
            updated_at    = CURRENT_TIMESTAMP"
    );

    if (!$stmt) {
        throw new Exception($conn->error);
    }

    // All four settings are saved together or not at all.
    $conn->begin_transaction();

    try {
        if(array_key_exists('platform_maintenance_mode_enabled',$toSave)){
            $current=$conn->query('SELECT * FROM maintenance_state WHERE id=1 FOR UPDATE')->fetch_assoc();
            $next=$toSave['platform_maintenance_mode_enabled'];
            if($next && !(int)$current['enabled'])$conn->query('UPDATE maintenance_state SET enabled=1,generation=generation+1,deadline=UNIX_TIMESTAMP()+60 WHERE id=1');
            elseif(!$next && (int)$current['enabled'])$conn->query('UPDATE maintenance_state SET enabled=0,deadline=0 WHERE id=1');
        }
        foreach ($toSave as $key => $value) {
            $stmt->bind_param('sii', $key, $value, $adminId);
            if (!$stmt->execute()) {
                throw new Exception($stmt->error);
            }
        }
        $conn->commit();
    } catch (Throwable $inner) {
        $conn->rollback();
        throw $inner;
    }

    $stmt->close();

    echo json_encode([
        'success'  => true,
        'message'  => 'Platform settings saved.',
        'settings' => platform_get_settings($conn)
    ]);

    $conn->close();

} catch (Throwable $e) {
    error_log('GABLE admin_platform_settings: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to process platform settings.',
        'error'   => $e->getMessage()
    ]);
}
