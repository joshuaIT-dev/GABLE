<?php
require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $conn = getConnection();
    $conn->set_charset('utf8mb4');

    $students = [];
    $sql = "SELECT s.student_id, s.student_number, s.first_name, s.last_name,
                   TRIM(COALESCE(s.college, '')) AS college,
                   TRIM(COALESCE(s.program, '')) AS program,
                   s.year_level, TRIM(COALESCE(s.block, '')) AS block, s.status,
                   COALESCE(x.xp, 0) AS xp,
                   COALESCE(x.attempts, 0) AS attempts,
                   x.average_score
            FROM student s
            LEFT JOIN (
                SELECT student_id,
                       SUM(CASE WHEN status IN ('submitted','graded') THEN COALESCE(xp_earned,0) ELSE 0 END) AS xp,
                       SUM(CASE WHEN status IN ('submitted','graded') THEN 1 ELSE 0 END) AS attempts,
                       AVG(CASE WHEN status IN ('submitted','graded') AND score IS NOT NULL THEN score ELSE NULL END) AS average_score
                FROM quiz_idsubmissions
                GROUP BY student_id
            ) x ON x.student_id = s.student_id
            ORDER BY xp DESC, average_score DESC, s.last_name ASC, s.first_name ASC";
    $result = $conn->query($sql);
    if (!$result) throw new Exception($conn->error);
    while ($row = $result->fetch_assoc()) {
        $program = trim((string)$row['program']);
        $year = trim((string)($row['year_level'] ?? ''));
        $block = trim((string)$row['block']);
        $row['name'] = trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? ''));
        $row['section'] = trim($program . ' ' . $year . $block);
        $row['xp'] = (int)$row['xp'];
        $row['attempts'] = (int)$row['attempts'];
        $row['average_score'] = $row['average_score'] === null ? null : (float)$row['average_score'];
        $students[] = $row;
    }

    $instructors = [];
    $result = $conn->query("SELECT instructor_id, instructor_number, first_name, last_name,
                                   TRIM(COALESCE(college,'')) AS college,
                                   TRIM(COALESCE(program,'')) AS program,
                                   COALESCE(teaching_exp,0) AS teaching_exp, grade, status
                            FROM instructor
                            ORDER BY teaching_exp DESC, last_name ASC, first_name ASC");
    if (!$result) throw new Exception($conn->error);
    while ($row = $result->fetch_assoc()) {
        $row['name'] = trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? ''));
        $row['teaching_exp'] = (int)$row['teaching_exp'];
        $row['sections'] = [];
        $instructors[(int)$row['instructor_id']] = $row;
    }

    // Include sections recorded either in teaching assignments or in quizzes.
    $sectionQueries = [
        "SELECT instructor_id, TRIM(section) AS section FROM teaching_assignments WHERE section IS NOT NULL AND TRIM(section) <> ''",
        "SELECT instructor_id, TRIM(section) AS section FROM quizzes WHERE section IS NOT NULL AND TRIM(section) <> ''"
    ];
    foreach ($sectionQueries as $sectionSql) {
        $result = $conn->query($sectionSql);
        if (!$result) throw new Exception($conn->error);
        while ($row = $result->fetch_assoc()) {
            $id = (int)$row['instructor_id'];
            $section = trim((string)$row['section']);
            if ($section !== '' && isset($instructors[$id]) && !in_array($section, $instructors[$id]['sections'], true)) {
                $instructors[$id]['sections'][] = $section;
            }
        }
    }
    $instructors = array_values($instructors);
    foreach ($instructors as &$instructor) sort($instructor['sections'], SORT_NATURAL | SORT_FLAG_CASE);
    unset($instructor);

    // Build the college list from every college recorded for either students or instructors.
    // This keeps colleges visible even when one side has no records or no scored attempts.
    $collegeNames = [];
    $collegeSql = "SELECT college FROM student WHERE TRIM(COALESCE(college,'')) <> ''
                   UNION SELECT college FROM instructor WHERE TRIM(COALESCE(college,'')) <> ''
                   ORDER BY college";
    $result = $conn->query($collegeSql);
    if (!$result) throw new Exception($conn->error);
    while ($row = $result->fetch_assoc()) {
        $name = trim((string)($row['college'] ?? ''));
        if ($name !== '') $collegeNames[$name] = true;
    }

    $collegeStats = [];
    $statsSql = "SELECT TRIM(COALESCE(s.college,'')) AS college,
                        COUNT(DISTINCT s.student_id) AS students,
                        COUNT(CASE WHEN qs.status IN ('submitted','graded') AND qs.score IS NOT NULL THEN qs.submission_id END) AS scored_attempts,
                        AVG(CASE WHEN qs.status IN ('submitted','graded') AND qs.score IS NOT NULL THEN qs.score ELSE NULL END) AS average_score,
                        COALESCE(SUM(CASE WHEN qs.status IN ('submitted','graded') THEN COALESCE(qs.xp_earned,0) ELSE 0 END),0) AS total_xp
                 FROM student s
                 LEFT JOIN quiz_idsubmissions qs ON qs.student_id = s.student_id
                 WHERE TRIM(COALESCE(s.college,'')) <> ''
                 GROUP BY TRIM(COALESCE(s.college,''))";
    $result = $conn->query($statsSql);
    if (!$result) throw new Exception($conn->error);
    while ($row = $result->fetch_assoc()) $collegeStats[trim((string)$row['college'])] = $row;

    $instructorCounts = [];
    foreach ($instructors as $instructor) {
        $college = trim((string)$instructor['college']);
        if ($college !== '') $instructorCounts[$college] = ($instructorCounts[$college] ?? 0) + 1;
    }

    $colleges = [];
    foreach (array_keys($collegeNames) as $collegeName) {
        $stats = $collegeStats[$collegeName] ?? [];
        $average = $stats['average_score'] ?? null;
        $colleges[] = [
            'college' => $collegeName,
            'students' => (int)($stats['students'] ?? 0),
            'instructors' => (int)($instructorCounts[$collegeName] ?? 0),
            'scored_attempts' => (int)($stats['scored_attempts'] ?? 0),
            'average_score' => $average === null ? null : (float)$average,
            'total_xp' => (int)($stats['total_xp'] ?? 0)
        ];
    }
    usort($colleges, function ($a, $b) {
        if ($a['average_score'] === null && $b['average_score'] !== null) return 1;
        if ($a['average_score'] !== null && $b['average_score'] === null) return -1;
        return (($b['average_score'] ?? -1) <=> ($a['average_score'] ?? -1))
            ?: ($b['students'] <=> $a['students'])
            ?: strcasecmp($a['college'], $b['college']);
    });

    echo json_encode(['success' => true, 'students' => $students, 'instructors' => $instructors, 'colleges' => $colleges], JSON_UNESCAPED_UNICODE);
    $conn->close();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to load leaderboard data.', 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
