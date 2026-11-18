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

    COALESCE(x.semester_xp, 0) AS xp,
    GREATEST(COALESCE(p.lifetime_xp,0),COALESCE(x.semester_xp,0)) AS level_xp

        FROM student s
        LEFT JOIN current_student_xp x ON x.student_id=s.student_id
        LEFT JOIN student_reward_progress p ON p.student_id=s.student_id

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
            'level_xp'            => (int)$row['level_xp'],
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