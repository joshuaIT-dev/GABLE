<?php
header('Content-Type: application/json; charset=utf-8');

// Use the same database connection helper as the other admin endpoints.
require_once __DIR__ . '/config.php';

try {
    $conn = getConnection();

    // A college may be represented by students, instructors, or admins.
    // UNION removes duplicates and keeps the filter populated even when a
    // college currently has no instructor record.
    $sql = "
        SELECT college
        FROM (
            SELECT TRIM(college) AS college
            FROM instructor
            WHERE college IS NOT NULL AND TRIM(college) <> ''

            UNION

            SELECT TRIM(college) AS college
            FROM student
            WHERE college IS NOT NULL AND TRIM(college) <> ''

            UNION

            SELECT TRIM(college) AS college
            FROM admin
            WHERE college IS NOT NULL AND TRIM(college) <> ''
        ) AS available_colleges
        ORDER BY college ASC
    ";

    $result = $conn->query($sql);
    if (!$result) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to retrieve colleges.'
        ]);
        exit;
    }

    $colleges = [];
    while ($row = $result->fetch_assoc()) {
        $colleges[] = $row['college'];
    }

    echo json_encode([
        'success' => true,
        'colleges' => $colleges
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to load colleges. Check the PHP/MySQL error log.'
    ]);
}
?>
