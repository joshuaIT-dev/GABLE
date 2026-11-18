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

$section=trim($student['program'].' '.$student['year_level'].$student['block']);
$subjects=$conn->prepare("SELECT DISTINCT TRIM(t.subject_name) subject,
    CONCAT_WS(' ',i.first_name,i.last_name) instructor
    FROM teaching_assignments t JOIN instructor i ON i.instructor_id=t.instructor_id
    WHERE LOWER(TRIM(t.section))=LOWER(TRIM(?)) AND i.status='Active'
    ORDER BY subject,instructor");
$subjects->bind_param('s',$section);
$subjects->execute();
$student['subjects']=$subjects->get_result()->fetch_all(MYSQLI_ASSOC);
$subjects->close();

echo json_encode([
    "success" => true,
    "student" => $student
]);

$stmt->close();
$conn->close();
