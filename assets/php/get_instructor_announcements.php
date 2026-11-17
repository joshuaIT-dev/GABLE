<?php

header('Content-Type: application/json');

require_once 'config.php';

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
        WHERE target IN ('all', 'instructors')
        ORDER BY created_at DESC
    ";

    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception($conn->error);
    }

    $notifications = [];

    while ($row = $result->fetch_assoc()) {

        $notifications[] = [
            'id'       => 'announcement-' . $row['announcement_id'],
            'type'     => 'announce',
            'title'    => $row['title'],
            'desc'     => $row['message'],
            'priority' => ucfirst($row['priority']),
            'target'   => $row['target'],
            'time'     => strtotime($row['created_at']) * 1000,
            'read'     => false
        ];
    }

    echo json_encode([
        'success' => true,
        'notifications' => $notifications
    ]);

    $conn->close();

} catch (Exception $e) {

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}