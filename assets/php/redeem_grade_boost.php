<?php
/*
|--------------------------------------------------------------------------
| redeem_grade_boost.php   (student, POST JSON: {"submission_id": 123})
|--------------------------------------------------------------------------
| Redeems 350 XP for a +1 boost on ONE finished formal quiz result.
|
| The server decides everything - the browser only asks:
|   1. Maintenance Mode and the Grade Boost Redemption setting are checked
|   2. the result must belong to the logged-in student
|   3. the quiz must be formal and fully graded, score below 100
|   4. the result must not have been boosted already
|   5. the student must have at least 350 XP available
|
| Everything is done in ONE database transaction, and the student row is
| locked first, so two quick clicks can never spend the same XP twice.
|--------------------------------------------------------------------------
*/

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/powerup_service.php';
require_once __DIR__ . '/platform_guard.php';
platform_block_students_if_maintenance();

const GRADE_BOOST_COST = 350;

/** Problems that are the student's/request's fault (not server errors). */
class GradeBoostException extends Exception {}

$studentId = (int)($_SESSION['student'] ?? $_SESSION['student_id'] ?? 0);

if ($studentId <= 0) {
    platform_json_exit(401, [
        'success' => false,
        'message' => 'Student session not found. Please log in again.'
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    platform_json_exit(405, ['success' => false, 'message' => 'Method not allowed.']);
}

$contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
if (strpos($contentType, 'application/json') === false) {
    platform_json_exit(415, ['success' => false, 'message' => 'Content-Type must be application/json.']);
}

$input = json_decode(file_get_contents('php://input'), true);
$submissionId = (int)($input['submission_id'] ?? 0);

if ($submissionId <= 0) {
    platform_json_exit(400, ['success' => false, 'message' => 'Invalid quiz result.']);
}

$conn = null;

try {
    $conn = getConnection();

    // Setting check happens on the server, before anything else.
    if (!platform_setting_enabled($conn, 'platform_grade_boost_enabled')) {
        $conn->close();
        platform_json_exit(403, [
            'success'               => false,
            'grade_boost_disabled'  => true,
            'message'               => 'Grade Boost Redemption is currently disabled by the administrator.'
        ]);
    }

    $conn->begin_transaction();

    // Lock this student's row so concurrent redemptions are processed one at a time.
    $stmt = $conn->prepare('SELECT student_id FROM student WHERE student_id = ? FOR UPDATE');
    $stmt->bind_param('i', $studentId);
    $stmt->execute();
    $found = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$found) {
        throw new GradeBoostException('Student not found.', 404);
    }

    // The result must belong to this student (row is locked while we work).
    $stmt = $conn->prepare(
        "SELECT submission_id, quiz_id, score, status
         FROM quiz_idsubmissions
         WHERE submission_id = ? AND student_id = ?
         LIMIT 1
         FOR UPDATE"
    );
    $stmt->bind_param('ii', $submissionId, $studentId);
    $stmt->execute();
    $sub = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$sub) {
        throw new GradeBoostException('Quiz result not found.', 404);
    }

    $quizId = (int)$sub['quiz_id'];

    $stmt = $conn->prepare('SELECT mode, questions FROM quizzes WHERE quiz_id = ? LIMIT 1');
    $stmt->bind_param('i', $quizId);
    $stmt->execute();
    $quiz = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$quiz) {
        throw new GradeBoostException('Quiz not found.', 404);
    }

    $sub['mode']      = $quiz['mode'];
    $sub['questions'] = $quiz['questions'];

    if (strtolower((string)$sub['mode']) !== 'formal') {
        throw new GradeBoostException('Grade boosts can only be used on formal quizzes.', 422);
    }

    if (!in_array($sub['status'], ['submitted', 'graded'], true)) {
        throw new GradeBoostException('This quiz result is still waiting for the instructor to finish grading.', 422);
    }

    if ($sub['status'] === 'submitted') {
        $questions = json_decode((string)$sub['questions'], true);
        if (is_array($questions)) {
            foreach ($questions as $question) {
                if (is_array($question) && ($question['type'] ?? '') === 'id') {
                    throw new GradeBoostException('This quiz result is still waiting for the instructor to finish grading.', 422);
                }
            }
        }
    }

    $scoreBefore = (float)$sub['score'];

    if ($scoreBefore >= 100) {
        throw new GradeBoostException('This quiz already has a perfect score.', 422);
    }

    // Already boosted?
    $stmt = $conn->prepare('SELECT redemption_id FROM grade_boost_redemptions WHERE submission_id = ? LIMIT 1');
    $stmt->bind_param('i', $submissionId);
    $stmt->execute();
    $already = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($already) {
        throw new GradeBoostException('This quiz result has already been boosted.', 409);
    }

    $state=pu_sync($conn,$studentId);
    $balance=$state['xp'];
    $useFree=($input['use_free_token'] ?? false) === true;
    $cost=$useFree ? 0 : GRADE_BOOST_COST;
    if ($useFree) {
        if (!pu_owned($conn,$studentId,'free_boost')) throw new GradeBoostException('No free grade boost token available.',422);
        pu_consume($conn,$studentId,'free_boost');
    } elseif ($balance<$cost) throw new GradeBoostException('Not enough XP. You need 350 XP.',422);
    $scoreAfter=min(100.0,$scoreBefore+1.0);
    // Record the redemption.
    $stmt = $conn->prepare(
        'INSERT INTO grade_boost_redemptions
            (student_id, submission_id, quiz_id, xp_cost, score_before, score_after)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('iiiidd', $studentId, $submissionId, $quizId, $cost, $scoreBefore, $scoreAfter);
    $stmt->execute();
    $stmt->close();

    // Apply the +1 to the student's score for that quiz.
    $stmt = $conn->prepare('UPDATE quiz_idsubmissions SET score = ? WHERE submission_id = ? AND student_id = ?');
    $stmt->bind_param('dii', $scoreAfter, $submissionId, $studentId);
    $stmt->execute();
    $stmt->close();

    $conn->commit();
    $conn->close();

    echo json_encode([
        'success'       => true,
        'message'       => 'Grade boost applied! +1 grade point.',
        'submission_id' => $submissionId,
        'score_before'  => $scoreBefore,
        'score_after'   => $scoreAfter,
        'xp_spent'      => $cost,
        'balance'       => $balance - $cost
    ]);

} catch (GradeBoostException $e) {

    if ($conn instanceof mysqli) {
        try { $conn->rollback(); $conn->close(); } catch (Throwable $ignored) {}
    }

    $code = (int)$e->getCode();
    if ($code < 400 || $code > 599) {
        $code = 400;
    }

    platform_json_exit($code, ['success' => false, 'message' => $e->getMessage()]);

} catch (Throwable $e) {

    if ($conn instanceof mysqli) {
        try { $conn->rollback(); $conn->close(); } catch (Throwable $ignored) {}
    }

    error_log('GABLE redeem_grade_boost: ' . $e->getMessage());

    // A duplicate-key error means another request boosted this result first.
    if ((int)$e->getCode() === 1062) {
        platform_json_exit(409, ['success' => false, 'message' => 'This quiz result has already been boosted.']);
    }

    platform_json_exit(500, [
        'success' => false,
        'message' => 'Failed to redeem grade boost.',
        'error'   => $e->getMessage()
    ]);
}
