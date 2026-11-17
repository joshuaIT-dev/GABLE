<?php

require_once 'config.php';

header('Content-Type: application/json');

try {

    $conn = getConnection();

    $sql = "
   SELECT
        instructor_id,
        instructor_number,
        institutional_email,
        first_name,
        last_name,
        college,
        program,
        teaching_exp,
        grade,
        course_alignment,
        evaluation_updated_at,
        status
    FROM instructor
    ORDER BY instructor_id ASC
    ";

    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception($conn->error);
    }

    $instructors = [];

    while ($row = $result->fetch_assoc()) {

        $instructors[] = [
    'instructor_id'        => (int)$row['instructor_id'],
    'instructor_number'    => $row['instructor_number'],
    'institutional_email'  => $row['institutional_email'] ?? '',
    'first_name'           => $row['first_name'] ?? '',
    'last_name'            => $row['last_name'] ?? '',
    'college'              => $row['college'] ?? '',
    'program'              => $row['program'] ?? '',
    'teaching_exp'         => (int)($row['teaching_exp'] ?? 0),

    // Instructor Evaluation
    'grade'                => $row['grade'] ?? null,
    'course_alignment'     => $row['course_alignment'] !== null
        ? (int)$row['course_alignment']
        : null,
    'evaluation_updated_at' => $row['evaluation_updated_at'] ?? null,

    'status'               => $row['status'] ?? 'Active'
        ];
    }

    echo json_encode([
        'success' => true,
        'instructors' => $instructors
    ]);

    $conn->close();

} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Failed to load instructors.',
        'error' => $e->getMessage()
    ]);
}