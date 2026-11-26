<?php
/*
|--------------------------------------------------------------------------
| get_grade_boosts.php   (student)
|--------------------------------------------------------------------------
| Returns what the Student "XP & Redemption" tab needs:
|   - whether Grade Boost Redemption is currently enabled
|   - the student's XP balance (earned minus spent on boosts)
|   - the quiz results that can still be boosted
|
| A result can be boosted when:
|   - it belongs to this student
|   - the quiz is a FORMAL quiz
|   - it is fully graded (status 'graded', or 'submitted' with no
|     identification questions waiting for the instructor)
|   - the score is below 100
|   - additional boosts may be redeemed until the score reaches 100
|--------------------------------------------------------------------------
*/

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/powerup_service.php';
require_once __DIR__ . '/platform_guard.php';
platform_block_students_if_maintenance();

$studentId = (int)($_SESSION['student'] ?? $_SESSION['student_id'] ?? 0);

if ($studentId <= 0) {
    platform_json_exit(401, [
        'success' => false,
        'message' => 'Student session not found. Please log in again.'
    ]);
}

try {
    $conn = getConnection();

    $enabled = platform_setting_enabled($conn, 'platform_grade_boost_enabled');

    $state=pu_balance($conn,$studentId);
    $earned=$state['earned_xp']+$state['bonus_xp'];
    $spent=$state['spent_xp'];

    $items = [];

    $stmt = $conn->prepare(
        "SELECT s.submission_id, s.quiz_id, s.score, s.status,
                q.title, q.questions
         FROM quiz_idsubmissions s
         INNER JOIN quizzes q ON q.quiz_id = s.quiz_id
         WHERE s.student_id = ?
           AND s.submission_id > (SELECT submission_cutoff FROM current_xp_semester)
           AND LOWER(q.mode) = 'formal'
           AND s.status IN ('submitted', 'graded')
           AND s.score < 100
         ORDER BY s.submitted_at DESC"
    );
    $stmt->bind_param('i', $studentId);
    $stmt->execute();
    $result = $stmt->get_result();

    while ($row = $result->fetch_assoc()) {

        // A 'submitted' result that still has identification questions is
        // waiting for the instructor, so it cannot be boosted yet.
        if ($row['status'] === 'submitted') {
            $questions = json_decode((string)$row['questions'], true);
            $hasId = false;
            if (is_array($questions)) {
                foreach ($questions as $question) {
                    if (is_array($question) && ($question['type'] ?? '') === 'id') {
                        $hasId = true;
                        break;
                    }
                }
            }
            if ($hasId) {
                continue;
            }
        }

        $score = (float)$row['score'];

        $items[] = [
            'submission_id' => (int)$row['submission_id'],
            'quiz_id'       => (int)$row['quiz_id'],
            'name'          => $row['title'],
            'current'       => $score,
            'boosted'       => min(100.0, $score + 1.0)
        ];
    }

    $stmt->close();
    $conn->close();

    echo json_encode([
        'success'     => true,
        'enabled'     => $enabled,
        'cost'        => 150,
        'earned_xp'   => $earned,
        'spent_xp'    => $spent,
        'balance'     => max(0, $earned - $spent),
        'eligible'    => $items
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (Throwable $e) {
    error_log('GABLE get_grade_boosts: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load grade boost information.',
        'error'   => $e->getMessage()
    ]);
}
