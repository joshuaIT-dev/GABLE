<?php
/*
|--------------------------------------------------------------------------
| get_admin_overview.php   (Admin only, read-only)
|--------------------------------------------------------------------------
| Real data for the Admin "System Overview" tab:
|   - the four stat cards
|   - Performance by College
|   - Recent Activity (submissions, new quizzes, flags, announcements,
|     grade boosts)
|   - Flagged Quizzes Awaiting Review (pending rows of the `flags` table)
|--------------------------------------------------------------------------
*/

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/platform_guard.php';

platform_require_admin();

function ov_rows(mysqli $conn, string $sql): array
{
    $result = $conn->query($sql);
    if (!$result) {
        throw new Exception($conn->error);
    }
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    $result->free();
    return $rows;
}

try {
    $conn = getConnection();

    /* ------------------------------------------------ stat cards */

    $m = ov_rows($conn, "
        SELECT
          (SELECT COUNT(*) FROM student WHERE LOWER(TRIM(status)) = 'active') AS students,
          (SELECT COUNT(*) FROM instructor WHERE LOWER(TRIM(status)) = 'active') AS instructors,
          (SELECT COUNT(DISTINCT TRIM(college)) FROM instructor
             WHERE LOWER(TRIM(status)) = 'active' AND TRIM(COALESCE(college,'')) <> '') AS instructor_colleges,
          (SELECT COUNT(*) FROM quizzes WHERE status = 'active') AS active_quizzes,
          (SELECT COUNT(*) FROM quizzes WHERE status = 'active' AND mode = 'formal') AS formal_quizzes,
          (SELECT COUNT(*) FROM quizzes WHERE status = 'active' AND mode = 'informal') AS informal_quizzes,
          (SELECT COUNT(*) FROM quizzes WHERE status = 'active'
             AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS quizzes_week,
          (SELECT COALESCE(SUM(semester_xp),0) FROM current_student_xp) AS total_xp,
          (SELECT COALESCE(SUM(xp_earned), 0) FROM quiz_idsubmissions
             WHERE status IN ('submitted','graded')
             AND submission_id > (SELECT submission_cutoff FROM current_xp_semester) AND submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS xp_week
    ")[0];

    /* ----------------------------------------- college performance */

    $colleges = ov_rows($conn, "
        SELECT c.college,
               ROUND(AVG(qs.score)) AS avg_score,
               (SELECT COALESCE(SUM(x.semester_xp),0) FROM current_student_xp x JOIN student sx ON sx.student_id=x.student_id WHERE TRIM(sx.college)=c.college) AS xp,
               COUNT(qs.submission_id) AS attempts
        FROM (
            SELECT TRIM(college) AS college FROM student
              WHERE TRIM(COALESCE(college,'')) <> ''
            UNION
            SELECT TRIM(college) AS college FROM instructor
              WHERE TRIM(COALESCE(college,'')) <> ''
        ) c
        LEFT JOIN student s ON TRIM(s.college) = c.college
        LEFT JOIN quiz_idsubmissions qs
               ON qs.student_id = s.student_id
              AND qs.status IN ('submitted','graded')
        GROUP BY c.college
        ORDER BY xp DESC, c.college ASC
    ");

    /* ------------------------------------------------ recent activity */

    $activity = [];

    $rows = ov_rows($conn, "
        SELECT UNIX_TIMESTAMP(qs.submitted_at) AS t, s.first_name, s.last_name, q.title
        FROM quiz_idsubmissions qs
        LEFT JOIN student s ON s.student_id = qs.student_id
        LEFT JOIN quizzes q ON q.quiz_id = qs.quiz_id
        ORDER BY qs.submitted_at DESC LIMIT 8
    ");
    foreach ($rows as $r) {
        $name = trim(($r['first_name'] ?? '') . ' ' . ($r['last_name'] ?? ''));
        $activity[] = [
            'icon' => '✅',
            'text' => ($name !== '' ? $name : 'A student') . ' completed "' . ($r['title'] ?? 'a quiz') . '"',
            'time' => (int)$r['t']
        ];
    }

    $rows = ov_rows($conn, "
        SELECT UNIX_TIMESTAMP(q.created_at) AS t, q.title, i.first_name, i.last_name
        FROM quizzes q
        LEFT JOIN instructor i ON i.instructor_id = q.instructor_id
        WHERE q.status = 'active'
        ORDER BY q.created_at DESC LIMIT 5
    ");
    foreach ($rows as $r) {
        $name = trim(($r['first_name'] ?? '') . ' ' . ($r['last_name'] ?? ''));
        $activity[] = [
            'icon' => '📝',
            'text' => ($name !== '' ? $name : 'An instructor') . ' posted quiz "' . $r['title'] . '"',
            'time' => (int)$r['t']
        ];
    }

    $rows = ov_rows($conn, "
        SELECT UNIX_TIMESTAMP(f.created_at) AS t, q.title
        FROM flags f
        LEFT JOIN quizzes q ON q.quiz_id = f.quiz_id
        ORDER BY f.created_at DESC LIMIT 5
    ");
    foreach ($rows as $r) {
        $activity[] = [
            'icon' => '⚠️',
            'text' => 'A question was flagged in "' . ($r['title'] ?? 'a quiz') . '"',
            'time' => (int)$r['t']
        ];
    }

    $rows = ov_rows($conn, "
        SELECT UNIX_TIMESTAMP(created_at) AS t, title
        FROM announcements ORDER BY created_at DESC LIMIT 5
    ");
    foreach ($rows as $r) {
        $activity[] = [
            'icon' => '📢',
            'text' => 'Announcement sent: "' . $r['title'] . '"',
            'time' => (int)$r['t']
        ];
    }

    // Grade boosts exist only after the platform migration was run.
    $hasBoostTable = $conn->query("SHOW TABLES LIKE 'grade_boost_redemptions'");
    if ($hasBoostTable && $hasBoostTable->num_rows > 0) {
        $rows = ov_rows($conn, "
            SELECT UNIX_TIMESTAMP(r.redeemed_at) AS t, s.first_name, s.last_name, q.title
            FROM grade_boost_redemptions r
            LEFT JOIN student s ON s.student_id = r.student_id
            LEFT JOIN quizzes q ON q.quiz_id = r.quiz_id
            ORDER BY r.redeemed_at DESC LIMIT 5
        ");
        foreach ($rows as $r) {
            $name = trim(($r['first_name'] ?? '') . ' ' . ($r['last_name'] ?? ''));
            $activity[] = [
                'icon' => '🎓',
                'text' => ($name !== '' ? $name : 'A student') . ' redeemed a grade boost on "' . ($r['title'] ?? 'a quiz') . '"',
                'time' => (int)$r['t']
            ];
        }
    }
    if ($hasBoostTable) {
        $hasBoostTable->free();
    }

    usort($activity, static function ($a, $b) {
        return $b['time'] <=> $a['time'];
    });
    $activity = array_slice($activity, 0, 12);

    /* ------------------------------------------------ flagged quizzes */

    $flagged = ov_rows($conn, "
        SELECT q.quiz_id, q.title,
               CONCAT(COALESCE(i.first_name,''), ' ', COALESCE(i.last_name,'')) AS instructor,
               COUNT(f.flag_id) AS flag_count,
               MAX(f.created_at) AS latest
        FROM flags f
        INNER JOIN quizzes q ON q.quiz_id = f.quiz_id
        LEFT JOIN instructor i ON i.instructor_id = q.instructor_id
        WHERE f.status = 'pending'
        GROUP BY q.quiz_id, q.title, i.first_name, i.last_name
        ORDER BY flag_count DESC, latest DESC
        LIMIT 20
    ");

    $reasons = [];
    if ($flagged) {
        $ids = implode(',', array_map(static function ($r) { return (int)$r['quiz_id']; }, $flagged));
        $reasonRows = ov_rows($conn, "
            SELECT quiz_id, reason FROM flags
            WHERE status = 'pending' AND quiz_id IN ($ids)
            ORDER BY created_at DESC
        ");
        foreach ($reasonRows as $r) {
            $qid = (int)$r['quiz_id'];
            if (!isset($reasons[$qid])) {
                $reasons[$qid] = $r['reason'];
            }
        }
    }

    $conn->close();

    echo json_encode([
        'success' => true,
        'metrics' => [
            'students'            => (int)$m['students'],
            'instructors'         => (int)$m['instructors'],
            'instructor_colleges' => (int)$m['instructor_colleges'],
            'active_quizzes'      => (int)$m['active_quizzes'],
            'formal_quizzes'      => (int)$m['formal_quizzes'],
            'informal_quizzes'    => (int)$m['informal_quizzes'],
            'quizzes_week'        => (int)$m['quizzes_week'],
            'total_xp'            => (int)$m['total_xp'],
            'xp_week'             => (int)$m['xp_week']
        ],
        'colleges' => array_map(static function ($r) {
            return [
                'name'     => $r['college'],
                'avg'      => $r['avg_score'] !== null ? (int)$r['avg_score'] : null,
                'xp'       => (int)$r['xp'],
                'attempts' => (int)$r['attempts']
            ];
        }, $colleges),
        'activity' => $activity,
        'flagged'  => array_map(static function ($r) use ($reasons) {
            $qid = (int)$r['quiz_id'];
            return [
                'quiz_id'    => $qid,
                'title'      => $r['title'],
                'instructor' => trim($r['instructor']),
                'reason'     => $reasons[$qid] ?? '',
                'count'      => (int)$r['flag_count']
            ];
        }, $flagged)
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (Throwable $e) {
    error_log('GABLE get_admin_overview: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to load overview data.',
        'error'   => $e->getMessage()
    ]);
}
