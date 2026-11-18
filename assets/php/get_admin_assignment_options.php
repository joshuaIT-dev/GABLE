<?php

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $db = getConnection();
    $college = trim((string)($_GET['college'] ?? ''));
    $program = trim((string)($_GET['program'] ?? ''));
    $selectedSubjects = array_values(array_unique(array_filter(
        array_map('trim', (array)($_GET['subjects'] ?? []))
    )));

    if ($college === '') {
        $result = $db->query("
            SELECT DISTINCT college AS value
            FROM student
            WHERE TRIM(COALESCE(college, '')) <> ''
            ORDER BY value
        ");
        echo json_encode([
            'success' => true,
            'colleges' => array_column($result->fetch_all(MYSQLI_ASSOC), 'value'),
            'programs' => [],
            'subjects' => [],
            'sections' => []
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $db->prepare("
        SELECT DISTINCT program AS value
        FROM student
        WHERE college = ? AND TRIM(COALESCE(program, '')) <> ''
        ORDER BY value
    ");
    $stmt->bind_param('s', $college);
    $stmt->execute();
    $programs = array_column($stmt->get_result()->fetch_all(MYSQLI_ASSOC), 'value');

    $subjects = [];
    $sections = [];
    if ($program !== '') {
        $sql = "
            SELECT CONVERT(ta.subject_name USING utf8mb4) COLLATE utf8mb4_unicode_ci AS value
            FROM teaching_assignments ta
            JOIN student s
              ON CONVERT(TRIM(ta.section) USING utf8mb4) COLLATE utf8mb4_unicode_ci =
                 CONVERT(CONCAT(TRIM(s.program), ' ', s.year_level, TRIM(s.block)) USING utf8mb4) COLLATE utf8mb4_unicode_ci
            WHERE s.college = ? AND s.program = ?
            UNION
            SELECT CONVERT(q.subject USING utf8mb4) COLLATE utf8mb4_unicode_ci AS value
            FROM quizzes q
            JOIN student s
              ON CONVERT(TRIM(q.section) USING utf8mb4) COLLATE utf8mb4_unicode_ci =
                 CONVERT(CONCAT(TRIM(s.program), ' ', s.year_level, TRIM(s.block)) USING utf8mb4) COLLATE utf8mb4_unicode_ci
            WHERE s.college = ? AND s.program = ?
            ORDER BY value
        ";
        $stmt = $db->prepare($sql);
        $stmt->bind_param('ssss', $college, $program, $college, $program);
        $stmt->execute();
        $subjects = array_column($stmt->get_result()->fetch_all(MYSQLI_ASSOC), 'value');

        if ($selectedSubjects) {
            $stmt = $db->prepare("
                SELECT DISTINCT year_level
                FROM student
                WHERE college = ? AND program = ? AND year_level IS NOT NULL
                ORDER BY year_level
            ");
            $stmt->bind_param('ss', $college, $program);
            $stmt->execute();
            $yearLevels = array_column($stmt->get_result()->fetch_all(MYSQLI_ASSOC), 'year_level');
            foreach ($yearLevels as $yearLevel) {
                foreach (range('A', 'Z') as $block) {
                    $sections[] = trim($program) . ' ' . $yearLevel . $block;
                }
            }
        }
    }

    echo json_encode([
        'success' => true,
        'colleges' => [],
        'programs' => $programs,
        'subjects' => $subjects,
        'sections' => $sections
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Could not load program assignment options.'
    ]);
}
