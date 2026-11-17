<?php

require_once 'config.php';

header('Content-Type: application/json');

try {

    $conn = getConnection();

    $sql = "
        SELECT
    s.student_id,
    s.student_number,
    s.institutional_email,
    s.first_name,
    s.last_name,
    s.college,
    s.program,
    s.year_level,
    s.block,
    s.status,

    COALESCE(
        (
            SELECT SUM(q.xp_earned)
            FROM quiz_idsubmissions q
            WHERE q.student_id = s.student_id
            AND q.status IN ('submitted', 'graded')
        ),
        0
    ) AS xp

        FROM student s

        ORDER BY s.student_id ASC
    ";

    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception($conn->error);
    }

    $students = [];

    while ($row = $result->fetch_assoc()) {

        $students[] = [
            'student_id'          => (int)$row['student_id'],
            'student_number'      => $row['student_number'],
            'institutional_email' => $row['institutional_email'],
            'first_name'          => $row['first_name'],
            'last_name'           => $row['last_name'],
            'college'             => $row['college'],
            'program'             => $row['program'],
            'year_level'          => $row['year_level'],
            'block'               => $row['block'],
            'status'              => $row['status'],
            'xp'                  => (int)$row['xp']
        ];
    }

    echo json_encode([
        'success' => true,
        'students' => $students
    ]);

    $conn->close();

} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Failed to load students.',
        'error' => $e->getMessage()
    ]);
}