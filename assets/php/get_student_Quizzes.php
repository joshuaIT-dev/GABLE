<?php

session_start();

header('Content-Type: application/json');

require_once 'config.php';
require_once __DIR__ . '/platform_guard.php';
platform_block_students_if_maintenance(); // Maintenance Mode (students only)


/*
|--------------------------------------------------------------------------
| CHECK STUDENT SESSION
|--------------------------------------------------------------------------
*/

$studentId =
    $_SESSION['student']
    ?? $_SESSION['student_id']
    ?? null;


if (!$studentId) {

    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Student session not found. Please log in again.'
    ]);

    exit;

}


/*
|--------------------------------------------------------------------------
| DATABASE CONNECTION
|--------------------------------------------------------------------------
*/

$conn = getConnection();


/*
|--------------------------------------------------------------------------
| GET STUDENT BLOCK
|--------------------------------------------------------------------------
*/

$studentSql = "

    SELECT
    program,
    year_level,
    block
FROM student
WHERE student_id = ?
LIMIT 1

";


$stmt = $conn->prepare(
    $studentSql
);


$stmt->bind_param(
    "i",
    $studentId
);


$stmt->execute();


$result =
    $stmt->get_result();


$student =
    $result->fetch_assoc();


if (!$student) {

    http_response_code(404);

    echo json_encode([
        'success' => false,
        'message' => 'Student not found.'
    ]);

    exit;

}


/*
|--------------------------------------------------------------------------
| CONVERT BLOCK TO SECTION
|--------------------------------------------------------------------------
|
| A → Section A
| B → Section B
| C → Section C
|
*/

$studentProgram = strtoupper(
    trim($student['program'] ?? '')
);

$studentYear = trim(
    $student['year_level'] ?? ''
);

$studentBlock = strtoupper(
    trim($student['block'] ?? '')
);

// Normalize the block
$studentBlock = preg_replace(
    '/^SECTION\s+/i',
    '',
    $studentBlock
);

// Build the exact class section
$studentSection =
    $studentProgram . ' ' .
    $studentYear .
    $studentBlock;


/*
|--------------------------------------------------------------------------
| GET ACTIVE QUIZZES FOR STUDENT
|--------------------------------------------------------------------------
*/

$quizSql = "

    SELECT

        quiz_id,
        instructor_id,
        title,
        subject,
        section,
        mode,
        quiz_type,
        due_date,
        time_limit,
        xp_reward,
        instructions,
        questions,
        created_at

    FROM quizzes

    WHERE LOWER(TRIM(section)) = LOWER(TRIM(?))
    AND status = 'active'

    ORDER BY created_at DESC
";


$stmt =
    $conn->prepare(
        $quizSql
    );


$stmt->bind_param(
    "s",
    $studentSection
);


$stmt->execute();


$result =
    $stmt->get_result();


$quizzes = [];
$reviewStmt=$conn->prepare("SELECT s.quiz_id FROM quiz_idsubmissions s JOIN quiz_reviewer_settings r ON r.quiz_id=s.quiz_id WHERE s.student_id=? AND s.status IN ('submitted','graded') AND r.reviewer_enabled=1 AND r.answers_released=1");
$reviewStmt->bind_param('i',$studentId); $reviewStmt->execute();
$reviewable=array_column($reviewStmt->get_result()->fetch_all(MYSQLI_ASSOC),'quiz_id');
$reviewStmt->close();
$snapshotStmt=$conn->prepare('SELECT s.quiz_id,p.snapshot_json FROM quiz_idsubmissions s JOIN quiz_submission_snapshots p ON p.submission_id=s.submission_id WHERE s.student_id=?');
$snapshotStmt->bind_param('i',$studentId);$snapshotStmt->execute();
$snapshots=[];
foreach($snapshotStmt->get_result()->fetch_all(MYSQLI_ASSOC) as $saved) $snapshots[$saved['quiz_id']]=json_decode($saved['snapshot_json'],true);
$snapshotStmt->close();



// Platform Settings: is Battle Royale currently allowed?
$battleRoyaleEnabled = platform_setting_enabled(
    $conn,
    'platform_battle_royale_enabled'
);


/*
|--------------------------------------------------------------------------
| FORMAT QUIZZES
|--------------------------------------------------------------------------
*/

while (
    $quiz =
    $result->fetch_assoc()
) {

    /*
    | Battle Royale is OFF: hide those quizzes from students.
    | The quiz rows stay in the database untouched.
    */
    if (
        !$battleRoyaleEnabled
        && platform_is_battle_royale($quiz['quiz_type'] ?? '')
    ) {
        continue;
    }

    /*
    |--------------------------------------------------------------------------
    | DECODE QUESTIONS JSON
    |--------------------------------------------------------------------------
    */

    $quiz['questions'] =
        json_decode(
            $quiz['questions'],
            true
        ) ?? [];


    /*
    |--------------------------------------------------------------------------
    | CONVERT MODE IF NEEDED
    |--------------------------------------------------------------------------
    */

    if (isset($snapshots[$quiz['quiz_id']]['questions'])) $quiz['questions']=$snapshots[$quiz['quiz_id']]['questions'];

    if (!in_array($quiz['quiz_id'], $reviewable)) {
        foreach ($quiz['questions'] as &$question) {
            unset($question['correct'], $question['answer'], $question['correct_answer'], $question['correctAnswer'], $question['expectedAnswer']);
        }
    }
    unset($question);

    $quiz['mode'] =
        strtolower(
            $quiz['mode']
        );


    $quizzes[] =
        $quiz;

}


/*
|--------------------------------------------------------------------------
| RESPONSE
|--------------------------------------------------------------------------
*/

echo json_encode([

    'success' => true,

    'student_section' =>
        $studentSection,

    'quizzes' =>
        $quizzes

]);


$stmt->close();

$conn->close();

?>