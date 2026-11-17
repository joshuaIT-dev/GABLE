<?php
require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

function reportRows(mysqli $conn, string $sql): array {
    $result = $conn->query($sql);
    if (!$result) throw new Exception($conn->error);
    $rows = [];
    while ($row = $result->fetch_assoc()) $rows[] = $row;
    $result->free();
    return $rows;
}

try {
    $conn = getConnection();

    $counts = reportRows($conn, "
        SELECT
          (SELECT COUNT(*) FROM student WHERE LOWER(TRIM(status)) = 'active') AS active_students,
          (SELECT COUNT(*) FROM instructor WHERE LOWER(TRIM(status)) = 'active') AS active_instructors,
          (SELECT COUNT(*) FROM quizzes WHERE LOWER(TRIM(status)) = 'active') AS active_quizzes,
          (SELECT COUNT(*) FROM quiz_idsubmissions WHERE LOWER(TRIM(status)) IN ('submitted','graded')) AS completed_submissions,
          (SELECT COUNT(*) FROM quiz_idsubmissions WHERE LOWER(TRIM(status)) IN ('submitted','graded') AND score IS NOT NULL) AS scored_submissions,
          (SELECT COALESCE(AVG(score), 0) FROM quiz_idsubmissions WHERE LOWER(TRIM(status)) IN ('submitted','graded') AND score IS NOT NULL) AS average_score
    ")[0];

    $xpRows = reportRows($conn, "
        SELECT COALESCE(SUM(q.xp_earned), 0) AS total_xp
        FROM student s
        LEFT JOIN quiz_idsubmissions q ON q.student_id = s.student_id
          AND LOWER(TRIM(q.status)) IN ('submitted','graded')
        WHERE LOWER(TRIM(s.status)) = 'active'
    ")[0];
    $activeStudents = (int)$counts['active_students'];
    $totalXp = (int)$xpRows['total_xp'];

    // Count only quiz/student pairs whose section matches the stored program + year + block.
    // Example: quiz section "BSIT 1Z" matches a BSIT, year 1, block Z student.
    $expected = reportRows($conn, "
        SELECT COUNT(*) AS expected_attempts
        FROM quizzes q
        INNER JOIN student s ON
          REPLACE(
            REPLACE(
              REPLACE(UPPER(TRIM(q.section)) COLLATE utf8mb4_general_ci,
                      _utf8mb4' ' COLLATE utf8mb4_general_ci,
                      _utf8mb4'' COLLATE utf8mb4_general_ci),
              _utf8mb4'-' COLLATE utf8mb4_general_ci,
              _utf8mb4'' COLLATE utf8mb4_general_ci),
            _utf8mb4'_' COLLATE utf8mb4_general_ci,
            _utf8mb4'' COLLATE utf8mb4_general_ci
          ) =
          REPLACE(
            REPLACE(
              REPLACE(UPPER(CONCAT(TRIM(COALESCE(s.program,'')), COALESCE(s.year_level,''), TRIM(COALESCE(s.block,'')))) COLLATE utf8mb4_general_ci,
                      _utf8mb4' ' COLLATE utf8mb4_general_ci,
                      _utf8mb4'' COLLATE utf8mb4_general_ci),
              _utf8mb4'-' COLLATE utf8mb4_general_ci,
              _utf8mb4'' COLLATE utf8mb4_general_ci),
            _utf8mb4'_' COLLATE utf8mb4_general_ci,
            _utf8mb4'' COLLATE utf8mb4_general_ci
          )
        WHERE LOWER(TRIM(q.status)) = 'active'
          AND LOWER(TRIM(s.status)) = 'active'
    ")[0];
    $expectedAttempts = (int)$expected['expected_attempts'];
    $completionRate = $expectedAttempts > 0
        ? min(100, ((int)$counts['completed_submissions'] / $expectedAttempts) * 100)
        : null;

    $topStudents = reportRows($conn, "
        SELECT s.student_id, s.first_name, s.last_name, s.college, s.program,
               s.year_level, s.block, COALESCE(SUM(q.xp_earned),0) AS xp
        FROM student s
        LEFT JOIN quiz_idsubmissions q ON q.student_id = s.student_id
          AND LOWER(TRIM(q.status)) IN ('submitted','graded')
        WHERE LOWER(TRIM(s.status)) = 'active'
        GROUP BY s.student_id, s.first_name, s.last_name, s.college, s.program, s.year_level, s.block
        ORDER BY xp DESC, s.last_name ASC, s.first_name ASC
        LIMIT 5
    ");

    $topInstructors = reportRows($conn, "
        SELECT instructor_id, first_name, last_name, college, program,
               COALESCE(teaching_exp,0) AS teaching_exp
        FROM instructor
        WHERE LOWER(TRIM(status)) = 'active'
        ORDER BY teaching_exp DESC, last_name ASC, first_name ASC
        LIMIT 5
    ");

    $redemptionTable = false;
    $tableCheck = $conn->query("SHOW TABLES LIKE 'grade_boost_redemptions'");
    if ($tableCheck) {
        $redemptionTable = $tableCheck->num_rows > 0;
        $tableCheck->free();
    }

    // Grade boost redemptions (table is created by the platform migration).
    $redemptionRows = [];
    if ($redemptionTable) {
        $redemptionRows = reportRows($conn, "
            SELECT r.redemption_id, r.xp_cost, r.score_before, r.score_after, r.redeemed_at,
                   s.first_name, s.last_name, q.title AS quiz_title
            FROM grade_boost_redemptions r
            LEFT JOIN student s ON s.student_id = r.student_id
            LEFT JOIN quizzes q ON q.quiz_id = r.quiz_id
            ORDER BY r.redeemed_at DESC, r.redemption_id DESC
            LIMIT 20
        ");
    }

    echo json_encode([
        'success' => true,
        'metrics' => [
            'active_students' => $activeStudents,
            'active_instructors' => (int)$counts['active_instructors'],
            'active_quizzes' => (int)$counts['active_quizzes'],
            'expected_attempts' => $expectedAttempts,
            'completed_submissions' => (int)$counts['completed_submissions'],
            'completion_rate' => $completionRate,
            'total_xp' => $totalXp,
            'average_xp_per_student' => $activeStudents > 0 ? $totalXp / $activeStudents : 0,
            'average_score' => (int)$counts['scored_submissions'] > 0 ? (float)$counts['average_score'] : null,
            'scored_submissions' => (int)$counts['scored_submissions']
        ],
        'top_students' => array_map(static function ($row) {
            return [
                'student_id' => (int)$row['student_id'],
                'name' => trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? '')),
                'college' => $row['college'] ?? '',
                'program' => $row['program'] ?? '',
                'year_level' => $row['year_level'] !== null ? (int)$row['year_level'] : null,
                'block' => $row['block'] ?? '',
                'xp' => (int)$row['xp']
            ];
        }, $topStudents),
        'top_instructors' => array_map(static function ($row) {
            return [
                'instructor_id' => (int)$row['instructor_id'],
                'name' => trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? '')),
                'college' => $row['college'] ?? '',
                'program' => $row['program'] ?? '',
                'teaching_exp' => (int)$row['teaching_exp']
            ];
        }, $topInstructors),
        'redemptions' => array_map(static function ($row) {
            return [
                'redemption_id' => (int)$row['redemption_id'],
                'student' => trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? '')),
                'quiz' => $row['quiz_title'] ?? '',
                'xp_cost' => (int)$row['xp_cost'],
                'score_before' => (float)$row['score_before'],
                'score_after' => (float)$row['score_after'],
                'redeemed_at' => $row['redeemed_at']
            ];
        }, $redemptionRows),
        'redemptions_available' => $redemptionTable,
        'notes' => [
            'completion_rate' => $expectedAttempts > 0 ? 'Based on active quizzes matched to active students by program/year/block section.' : 'No active quiz/student section matches were found, so completion rate is unavailable.',
            'instructor_ranking' => 'Ranked by the teaching_exp value currently stored on instructor records.',
            'redemptions' => $redemptionTable ? 'Showing the 20 most recent grade boost redemptions.' : 'No grade boost redemption table exists in the supplied database schema.'
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

    $conn->close();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to load report data.', 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
