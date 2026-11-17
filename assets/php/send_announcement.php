<?php

session_start();

header('Content-Type: application/json');

require_once 'config.php';

// Only a logged-in Admin may send announcements, and the sender is recorded
// so Announcement History can show who sent it.
$adminId = (int)($_SESSION['admin'] ?? 0);

if ($adminId <= 0) {

    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Admin session required. Please log in as an Admin.'
    ]);

    exit;
}

try {

    // Get the database connection
    $conn = getConnection();

    $data = json_decode(
        file_get_contents("php://input"),
        true
    );

    if (!$data) {
        throw new Exception("Invalid request data.");
    }

    $title = trim($data['title'] ?? '');
    $message = trim($data['message'] ?? '');
    $target = $data['target'] ?? 'all';
    $priority = $data['priority'] ?? 'normal';

    if ($title === '') {
        throw new Exception("Announcement title is required.");
    }

    $validTargets = [
        'all',
        'students',
        'instructors'
    ];

    if (!in_array($target, $validTargets, true)) {
        throw new Exception("Invalid announcement target.");
    }

    $validPriorities = [
        'normal',
        'important',
        'urgent'
    ];

    if (!in_array($priority, $validPriorities, true)) {
        throw new Exception("Invalid announcement priority.");
    }

    $sql = "
        INSERT INTO announcements
        (
            title,
            message,
            target,
            priority,
            created_by
        )
        VALUES (?, ?, ?, ?, ?)
    ";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception($conn->error);
    }

    $stmt->bind_param(
        "ssssi",
        $title,
        $message,
        $target,
        $priority,
        $adminId
    );

    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Announcement sent successfully.',
        'announcement_id' => $stmt->insert_id
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