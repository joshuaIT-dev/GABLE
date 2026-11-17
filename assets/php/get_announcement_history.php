<?php
/*
|--------------------------------------------------------------------------
| get_announcement_history.php   (Admin only, read-only)
|--------------------------------------------------------------------------
| Returns announcements that were already sent, newest first, with
| pagination:   GET ?page=1&per_page=10
|
| Reads the existing `announcements` table. The sender name comes from the
| `admin` table through announcements.created_by (older announcements that
| were sent before the sender was recorded simply have no sender).
|--------------------------------------------------------------------------
*/

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/platform_guard.php';

platform_require_admin();

$page    = max(1, (int)($_GET['page'] ?? 1));
$perPage = (int)($_GET['per_page'] ?? 10);
$perPage = max(1, min(50, $perPage));

try {
    $conn = getConnection();

    $totalResult = $conn->query('SELECT COUNT(*) AS total FROM announcements');
    $total = (int)($totalResult->fetch_assoc()['total'] ?? 0);
    $totalResult->free();

    $pages = max(1, (int)ceil($total / $perPage));
    if ($page > $pages) {
        $page = $pages;
    }
    $offset = ($page - 1) * $perPage;

    $stmt = $conn->prepare(
        "SELECT n.announcement_id, n.title, n.message, n.target, n.priority,
                n.created_by, n.created_at,
                a.first_name, a.last_name
         FROM announcements n
         LEFT JOIN admin a ON a.admin_id = n.created_by
         ORDER BY n.created_at DESC, n.announcement_id DESC
         LIMIT ? OFFSET ?"
    );
    $stmt->bind_param('ii', $perPage, $offset);
    $stmt->execute();
    $result = $stmt->get_result();

    $items = [];
    while ($row = $result->fetch_assoc()) {
        $sender = trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? ''));
        $items[] = [
            'id'         => (int)$row['announcement_id'],
            'title'      => $row['title'],
            'message'    => $row['message'],
            'target'     => $row['target'],
            'priority'   => $row['priority'],
            'created_at' => $row['created_at'],
            'sender'     => $sender !== '' ? $sender : null
        ];
    }

    $stmt->close();
    $conn->close();

    echo json_encode([
        'success'  => true,
        'items'    => $items,
        'page'     => $page,
        'per_page' => $perPage,
        'total'    => $total,
        'pages'    => $pages
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (Throwable $e) {
    error_log('GABLE get_announcement_history: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load announcement history.',
        'error'   => $e->getMessage()
    ]);
}
