<?php
/*
|--------------------------------------------------------------------------
| admin_resolve_flags.php   (Admin only, POST JSON: {"quiz_id": 5})
|--------------------------------------------------------------------------
| Marks every PENDING flag of one quiz as resolved. The flag rows are kept
| (status = 'resolved', resolved_at = now). resolved_by is left empty
| because that column holds instructor ids in the existing instructor flow.
|--------------------------------------------------------------------------
*/

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/platform_guard.php';

platform_require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    platform_json_exit(405, ['success' => false, 'message' => 'Method not allowed.']);
}

if (strpos(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json') === false) {
    platform_json_exit(415, ['success' => false, 'message' => 'Content-Type must be application/json.']);
}

$input  = json_decode(file_get_contents('php://input'), true);
$quizId = (int)($input['quiz_id'] ?? 0);

if ($quizId <= 0) {
    platform_json_exit(400, ['success' => false, 'message' => 'Invalid quiz.']);
}

try {
    $conn = getConnection();

    $stmt = $conn->prepare(
        "UPDATE flags
         SET status = 'resolved', resolved_at = NOW()
         WHERE quiz_id = ? AND status = 'pending'"
    );
    $stmt->bind_param('i', $quizId);
    $stmt->execute();
    $resolved = $stmt->affected_rows;
    $stmt->close();
    $conn->close();

    echo json_encode([
        'success'  => true,
        'resolved' => $resolved,
        'message'  => $resolved > 0 ? 'Flags resolved.' : 'There were no pending flags for this quiz.'
    ]);

} catch (Throwable $e) {
    error_log('GABLE admin_resolve_flags: ' . $e->getMessage());
    platform_json_exit(500, [
        'success' => false,
        'message' => 'Failed to resolve flags.',
        'error'   => $e->getMessage()
    ]);
}
