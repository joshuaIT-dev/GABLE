<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';

if (empty($_SESSION['admin'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Admin session required.']);
    exit;
}

$allowed = [
    'xp_alignment_95_enabled',
    'xp_pass_rate_85_enabled',
    'xp_perfect_score_enabled',
    'xp_seven_day_streak_enabled'
];
$defaults = array_fill_keys($allowed, 1);

try {
    $conn = getConnection();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $settings = $defaults;
        $result = $conn->query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('xp_alignment_95_enabled','xp_pass_rate_85_enabled','xp_perfect_score_enabled','xp_seven_day_streak_enabled')");
        if (!$result) throw new Exception($conn->error);
        while ($row = $result->fetch_assoc()) {
            $settings[$row['setting_key']] = (int)$row['setting_value'];
        }
        echo json_encode(['success' => true, 'settings' => $settings]);
        $conn->close();
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
        exit;
    }

    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload) || !isset($payload['settings']) || !is_array($payload['settings'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid settings payload.']);
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP");
    if (!$stmt) throw new Exception($conn->error);
    $adminId = (int)$_SESSION['admin'];
    foreach ($allowed as $key) {
        if (!array_key_exists($key, $payload['settings'])) continue;
        $value = ((int)$payload['settings'][$key]) === 1 ? 1 : 0;
        $stmt->bind_param('sii', $key, $value, $adminId);
        if (!$stmt->execute()) throw new Exception($stmt->error);
    }
    $stmt->close();
    $conn->close();
    echo json_encode(['success' => true, 'message' => 'XP rules saved.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to process XP settings.', 'error' => $e->getMessage()]);
}
