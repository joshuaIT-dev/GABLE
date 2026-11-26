<?php

session_start();
header('Content-Type: application/json');

require_once 'config.php';
require_once __DIR__ . '/platform_guard.php';
platform_block_students_if_maintenance(); // Maintenance Mode (students only)

try {

    $studentId = $_SESSION['student'] ?? $_SESSION['student_id'] ?? null;
    if (!$studentId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Student session not found.']);
        exit;
    }

    $conn = getConnection();

    $sql = "
        SELECT a.announcement_id, a.title, a.message, a.target, a.priority, a.created_at,
               (r.announcement_id IS NOT NULL) AS is_read
        FROM announcements a
        LEFT JOIN student_announcement_notification_reads r
            ON r.student_id = ? AND r.announcement_id = a.announcement_id
        LEFT JOIN student_notification_dismissals d
            ON d.student_id = ? AND d.notification_type = 'announcement' AND d.notification_id = a.announcement_id
        WHERE a.target IN ('all', 'students') AND d.notification_id IS NULL
        ORDER BY a.created_at DESC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ii', $studentId, $studentId);
    $stmt->execute();
    $result = $stmt->get_result();

    if (!$result) {
        throw new Exception($conn->error);
    }

    $announcements = [];

    while ($row = $result->fetch_assoc()) {

        $announcements[] = [
            'id'       => $row['announcement_id'],
            'title'    => $row['title'],
            'body'     => $row['message'],
            'target'   => $row['target'] === 'all'
                            ? 'All Users'
                            : 'All Students',
            'priority' => ucfirst($row['priority']),
            'sentAt'   => $row['created_at'],
            'read'     => (bool)$row['is_read']
        ];
    }

    echo json_encode([
        'success' => true,
        'announcements' => $announcements
    ]);

    $stmt->close();
    $conn->close();

} catch (Exception $e) {

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
