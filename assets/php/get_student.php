<?php

require 'config.php';

session_start();

require_once __DIR__ . '/platform_guard.php';
platform_block_students_if_maintenance(); // Maintenance Mode (students only)

header('Content-Type: application/json');

$student_id = $_SESSION['student'] ?? $_SESSION['student_id'] ?? null;

if (!$student_id) {
    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "Not logged in"
    ]);

    exit;
}

$conn = getConnection();

$stmt = $conn->prepare("
    SELECT
        student_id,
        student_number,
        institutional_email,
        first_name,
        last_name,
        college,
        program,
        block,
        year_level
    FROM student
    WHERE student_id = ?
    LIMIT 1
");


$stmt->bind_param("i", $student_id);

$stmt->execute();

$result = $stmt->get_result();

if ($result->num_rows === 0) {

    http_response_code(404);

    echo json_encode([
        "success" => false,
        "message" => "Student not found"
    ]);

    exit;
}

$student = $result->fetch_assoc();

echo json_encode([
    "success" => true,
    "student" => $student
]);

$stmt->close();
$conn->close();
