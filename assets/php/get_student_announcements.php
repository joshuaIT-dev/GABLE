<?php

header('Content-Type: application/json');

require_once 'config.php';
require_once __DIR__ . '/platform_guard.php';
platform_block_students_if_maintenance(); // Maintenance Mode (students only)

try {

    $conn = getConnection();

    $sql = "
        SELECT
            announcement_id,
            title,
            message,
            target,
            priority,
            created_at
        FROM announcements
        WHERE target IN ('all', 'students')
        ORDER BY created_at DESC
    ";

    $result = $conn->query($sql);

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
            'read'     => false
        ];
    }

    echo json_encode([
        'success' => true,
        'announcements' => $announcements
    ]);

    $conn->close();

} catch (Exception $e) {

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}