<?php

session_start();
$finalizing=PHP_SAPI==='cli' && ($argv[1]??'')==='--finalize';
if ($finalizing) {
    $_SESSION['student']=(int)($argv[2]??0);
    $_SERVER['REQUEST_METHOD']='POST';
    $_SERVER['CONTENT_TYPE']='application/json';
}

header('Content-Type: application/json');

require_once 'config.php';
require_once __DIR__ . '/powerup_service.php';
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
| ONLY POST REQUESTS
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;

}


/*
|--------------------------------------------------------------------------
| GET JSON INPUT
|--------------------------------------------------------------------------
*/

if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
    http_response_code(415); echo json_encode(['success'=>false,'message'=>'JSON request required.']); exit;
}

$input =
    json_decode(
        file_get_contents('php://input'),
        true
    );


$input=$finalizing?['quiz_id'=>(int)($argv[3]??0),'answers'=>[]]:$input;

$quizId =
    (int)(
        $input['quiz_id']
        ?? 0
    );


$answers =
    $input['answers']
    ?? [];


$score =
    (float)(
        $input['score']
        ?? 0
    );


$xpEarned =
    (int)(
        $input['xp_earned']
        ?? 0
    );


/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
*/

if ($quizId <= 0) {

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => 'Invalid quiz ID.'
    ]);

    exit;

}


if (!is_array($answers)) {

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => 'Answers must be an array.'
    ]);

    exit;

}


/*
|--------------------------------------------------------------------------
| ENCODE ANSWERS
|--------------------------------------------------------------------------
*/

$answersJson =
    json_encode(
        $answers,
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
    );


if ($answersJson === false) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Failed to process answers.'
    ]);

    exit;

}


try {

    $conn =
        getConnection();
    $conn->begin_transaction();
    pu_lock($conn, (int)$studentId);
    $saved=pu_row($conn,'SELECT * FROM quiz_idsubmissions WHERE student_id=? AND quiz_id=?',[$studentId,$quizId]);
    if ($saved) {
        $conn->commit();
        echo json_encode(['success'=>true,'submission_id'=>(int)$saved['submission_id'],'status'=>$saved['status'],'score'=>(float)$saved['score'],'xp_earned'=>(int)$saved['xp_earned'],'answers'=>json_decode($saved['answers'],true)]);
        exit;
    }
    if ($finalizing) {
        $due=pu_row($conn,'SELECT deadline FROM student_quiz_attempts WHERE student_id=? AND quiz_id=?',[$studentId,$quizId]);
        if (!$due || !(int)$due['deadline'] || (int)$due['deadline']>time()) throw new RuntimeException('Attempt has not expired.',409);
    }


        /*
|--------------------------------------------------------------------------
| VERIFY STUDENT SECTION
|--------------------------------------------------------------------------
| A student can only submit a quiz that belongs
| to their assigned section.
*/

$sectionSql = "

    SELECT
        s.program AS student_program,
        s.year_level AS student_year,
        s.block AS student_block,
        q.section AS quiz_section,
        q.status AS quiz_status,
        q.quiz_type AS quiz_type,
        q.questions AS quiz_questions,
        q.due_date AS quiz_due_date,
        q.xp_reward AS quiz_xp_reward

    FROM student s

    INNER JOIN quizzes q
        ON q.quiz_id = ?

    WHERE s.student_id = ?

    LIMIT 1

";

$sectionStmt =
    $conn->prepare($sectionSql);

if (!$sectionStmt) {

    throw new Exception(
        $conn->error
    );

}

$sectionStmt->bind_param(
    "ii",
    $quizId,
    $studentId
);

$sectionStmt->execute();

$sectionResult =
    $sectionStmt->get_result();

$sectionData =
    $sectionResult->fetch_assoc();

$sectionStmt->close();


/*
|--------------------------------------------------------------------------
| CHECK QUIZ EXISTS
|--------------------------------------------------------------------------
*/

if (!$sectionData) {

    http_response_code(404);

    echo json_encode([
        'success' => false,
        'message' => 'Quiz not found.'
    ]);

    $conn->close();

    exit;

}


/*
|--------------------------------------------------------------------------
| CHECK QUIZ STATUS
|--------------------------------------------------------------------------
*/

if (
    strtolower(
        trim(
            $sectionData['quiz_status']
        )
    ) !== 'active'
) {

    http_response_code(403);

    echo json_encode([
        'success' => false,
        'message' =>
            'This quiz is not currently active.'
    ]);

    $conn->close();

    exit;

}


/*
|--------------------------------------------------------------------------
| NORMALIZE STUDENT SECTION
|--------------------------------------------------------------------------
|
| Database examples:
|
| A          → Section A
| B          → Section B
| Section A  → Section A
| Section B  → Section B
|
*/

$studentProgram =
    strtoupper(
        trim(
            $sectionData['student_program'] ?? ''
        )
    );

$studentYear =
    trim(
        $sectionData['student_year'] ?? ''
    );

$studentBlock =
    strtoupper(
        trim(
            $sectionData['student_block'] ?? ''
        )
    );

// Remove "SECTION " if it exists
$studentBlock =
    preg_replace(
        '/^SECTION\s+/i',
        '',
        $studentBlock
    );

// Build the student's full section
$studentSection =
    'SECTION ' .
    $studentProgram .
    ' ' .
    $studentYear .
    $studentBlock;


/*
|--------------------------------------------------------------------------
| NORMALIZE QUIZ SECTION
|--------------------------------------------------------------------------
*/

$quizSection =
    strtoupper(
        trim(
            $sectionData['quiz_section'] ?? ''
        )
    );

$quizSection =
    preg_replace(
        '/^SECTION\s+/i',
        '',
        $quizSection
    );

$quizSection =
    'SECTION ' .
    $quizSection;


/*
|--------------------------------------------------------------------------
| VERIFY SECTION MATCH
|--------------------------------------------------------------------------
*/

if (
    $studentSection !== $quizSection
) {

    http_response_code(403);

    echo json_encode([
        'success' => false,
        'message' =>
            'You cannot submit a quiz assigned to another section.'
    ]);

    $conn->close();

    exit;

}


    /*
    |--------------------------------------------------------------------------
    | PREVENT DUPLICATE SUBMISSION
    |--------------------------------------------------------------------------
    */


    /*
    |--------------------------------------------------------------------------
    | PLATFORM SETTINGS: BATTLE ROYALE + AUTO-GRADING
    |--------------------------------------------------------------------------
    | Enforced here on the server, so a student cannot bypass them by
    | calling this endpoint directly.
    |--------------------------------------------------------------------------
    */

    $platform = platform_get_settings($conn);

    if (
        !$platform['platform_battle_royale_enabled']
        && platform_is_battle_royale($sectionData['quiz_type'] ?? '')
    ) {

        http_response_code(403);

        echo json_encode([
            'success' => false,
            'battle_royale_disabled' => true,
            'message' =>
                'Battle Royale quizzes are currently disabled by the administrator.'
        ]);

        $conn->close();

        exit;

    }

    $autoGrading = (int)$platform['platform_auto_grading_enabled'] === 1;
    $questions = json_decode($sectionData['quiz_questions'], true) ?: [];
    if (!$questions) throw new RuntimeException('Quiz has no questions.');
    $attempt=pu_row($conn,'SELECT * FROM student_quiz_attempts WHERE student_id=? AND quiz_id=?',[$studentId,$quizId]);
    if (!$attempt || !(int)$attempt['open_count']) throw new RuntimeException('Open the quiz before submitting.',409);
    $original=empty($attempt['snapshot_json'])?null:json_decode($attempt['snapshot_json'],true,512,JSON_THROW_ON_ERROR);
    if ($original) { $questions=$original['questions']; $sectionData['quiz_xp_reward']=$original['xp_reward']; $sectionData['quiz_due_date']=$original['due_date']; }
    if (!empty($sectionData['quiz_due_date'])) $attempt['deadline']=min((int)$attempt['deadline'],strtotime($sectionData['quiz_due_date'].' 23:59:59'));

    $expired=false;
    if ($attempt && (int)$attempt['open_count']>0) {
        $expired=time()>=(int)$attempt['deadline'];
        if (!$expired && (!$attempt['session_token'] || !hash_equals($attempt['session_token'],(string)($input['session_token'] ?? '')))) throw new RuntimeException('This quiz session is no longer active.',409);
        if ($expired) {
            $stored=json_decode($attempt['answers'],true) ?: [];
            $answers=array_map(fn($i)=>['answer'=>$stored[$i] ?? null],array_keys($questions));
        }
    }
    $supplied = $answers; $answers = []; $correctCount = 0; $hasPending = false;
    foreach ($questions as $index => $question) {
        $value = $supplied[$index]['answer'] ?? null;
        $isIdentification = ($question['type'] ?? 'mc') === 'id';
        $choices = $question['choices'] ?? $question['opts'] ?? [];
        if (!$expired && (($isIdentification && (!is_string($value) || trim($value)==='' || mb_strlen($value)>2000)) ||
            (!$isIdentification && (!is_int($value) || !isset($choices[$value]))))) {
            throw new RuntimeException('Please provide a valid answer for every question.',422);
        }
        $pending = ($value!==null && $value!=='') && (!$autoGrading || ($question['type'] ?? 'mc') === 'id');
        $correct = $pending ? null : (is_int($value) && isset($question['correct']) && $value === (int)$question['correct']);
        $correctCount += $correct === true ? 1 : 0;
        $hasPending = $hasPending || $pending;
        $answers[] = ['questionIndex'=>$index, 'type'=>$question['type'] ?? 'mc', 'question'=>$question['text'] ?? $question['q'] ?? '', 'answer'=>$value, 'correct'=>$correct, 'pending'=>$pending];
    }
    $submissionStatus = $hasPending ? 'pending_review' : 'submitted';
    $score = round($correctCount / count($questions) * 100);
    $xpEarned = $hasPending ? 0 : (int)round((int)$sectionData['quiz_xp_reward'] * $correctCount / count($questions));
    $answersJson = json_encode($answers, JSON_UNESCAPED_UNICODE);

    $checkSql = "

        SELECT submission_id

        FROM quiz_IDsubmissions

        WHERE quiz_id = ?
        AND student_id = ?

        LIMIT 1

    ";


    $checkStmt =
        $conn->prepare(
            $checkSql
        );


    if (!$checkStmt) {

        throw new Exception(
            $conn->error
        );

    }


    $checkStmt->bind_param(

        "ii",

        $quizId,

        $studentId

    );


    $checkStmt->execute();


    $existing =
        $checkStmt
            ->get_result()
            ->fetch_assoc();


    $checkStmt->close();


    if ($existing) {
        $saved=pu_row($conn,'SELECT * FROM quiz_idsubmissions WHERE submission_id=?',[$existing['submission_id']]);
        $conn->commit();
        echo json_encode(['success'=>true,'submission_id'=>(int)$saved['submission_id'],'status'=>$saved['status'],'score'=>(float)$saved['score'],'xp_earned'=>(int)$saved['xp_earned'],'answers'=>json_decode($saved['answers'],true)]);
        exit;
    }

    /*
    |--------------------------------------------------------------------------
    | INSERT SUBMISSION
    |--------------------------------------------------------------------------
    */

    $baseXp = $xpEarned;
    $xpEarned = 0;

    $sql = "

        INSERT INTO quiz_IDsubmissions (

            quiz_id,

            student_id,

            answers,

            score,

            xp_earned,

            status

        )

        VALUES (?, ?, ?, ?, ?, ?)

    ";


    $stmt =
        $conn->prepare(
            $sql
        );


    if (!$stmt) {

        throw new Exception(
            $conn->error
        );

    }


    $stmt->bind_param(

        "iisdis",

        $quizId,

        $studentId,

        $answersJson,

        $score,

        $xpEarned,

        $submissionStatus

    );


    if (!$stmt->execute()) {

        throw new Exception(
            $stmt->error
        );

    }


    $submissionId =
        $stmt->insert_id;
    $snapshot=pu_row($conn,"SELECT q.title,q.subject,q.section,CONCAT(i.first_name,' ',i.last_name) instructor,CONCAT(s.first_name,' ',s.last_name) student FROM quizzes q JOIN instructor i ON i.instructor_id=q.instructor_id JOIN student s ON s.student_id=? WHERE q.quiz_id=?",[$studentId,$quizId]);
    if ($original) $snapshot=array_replace($snapshot,array_intersect_key($original,array_flip(['title','subject','section','xp_reward'])));
    $snapshot['xp_reward']=(int)$sectionData['quiz_xp_reward'];
    $snapshot['questions']=$questions;
    pu_query($conn,'INSERT INTO quiz_submission_snapshots(submission_id,snapshot_json) VALUES (?,?)',[$submissionId,json_encode($snapshot,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
    pu_activity($conn,(int)$studentId);
    if (!$hasPending) {
        $xpEarned=pu_award($conn,(int)$studentId,(int)$submissionId,$baseXp);
        pu_query($conn,'UPDATE quiz_idsubmissions SET xp_earned=? WHERE submission_id=?',[$xpEarned,$submissionId]);
    }
    pu_sync($conn,(int)$studentId);


        /*
|--------------------------------------------------------------------------
| GET QUIZ + INSTRUCTOR + STUDENT INFORMATION
|--------------------------------------------------------------------------
*/

$notificationInfoSql = "

    SELECT

        q.instructor_id,

        q.title AS quiz_title,

        s.first_name,

        s.last_name

    FROM quizzes q

    INNER JOIN student s

        ON s.student_id = ?

    WHERE q.quiz_id = ?

    LIMIT 1

";


$notificationInfoStmt =
    $conn->prepare(
        $notificationInfoSql
    );


if (!$notificationInfoStmt) {

    throw new Exception(
        $conn->error
    );

}


$notificationInfoStmt->bind_param(

    "ii",

    $studentId,

    $quizId

);


$notificationInfoStmt->execute();


$notificationInfoResult =
    $notificationInfoStmt
        ->get_result();


$notificationInfo =
    $notificationInfoResult
        ->fetch_assoc();


$notificationInfoStmt->close();


if (!$notificationInfo) {

    throw new Exception(
        'Could not find quiz or instructor information.'
    );

}


/*
|--------------------------------------------------------------------------
| PREPARE NOTIFICATION DATA
|--------------------------------------------------------------------------
*/

$instructorId =
    (int)$notificationInfo[
        'instructor_id'
    ];


$studentName =

    trim(

        ($notificationInfo['first_name'] ?? '')
        . ' '
        .
        ($notificationInfo['last_name'] ?? '')

    );


$quizTitle =
    $notificationInfo[
        'quiz_title'
    ];


$notificationTitle =
    'Quiz Completed';


$notificationMessage =

    $studentName

    . ' completed "'

    . $quizTitle

    . '".';


/*
|--------------------------------------------------------------------------
| CREATE INSTRUCTOR NOTIFICATION
|--------------------------------------------------------------------------
*/

$notificationSql = "

    INSERT INTO instructor_notifications (

        instructor_id,

        student_id,

        quiz_id,

        submission_id,

        type,

        title,

        message

    )

    VALUES (

        ?,

        ?,

        ?,

        ?,

        'submit',

        ?,

        ?

    )

";


$notificationStmt =
    $conn->prepare(
        $notificationSql
    );


if (!$notificationStmt) {

    throw new Exception(
        $conn->error
    );

}


$notificationStmt->bind_param(

    "iiiiss",

    $instructorId,

    $studentId,

    $quizId,

    $submissionId,

    $notificationTitle,

    $notificationMessage

);


if (

    !$notificationStmt->execute()

) {

    throw new Exception(
        $notificationStmt->error
    );

}


$notificationStmt->close();


    $conn->commit();

    echo json_encode([

        'success' => true,

        'message' =>
            'Quiz submitted successfully.',
        'auto_graded' => $autoGrading,
        'status' => $submissionStatus,
        'score' => $score,
        'answers' => $answers,
        'xp_earned' => $xpEarned,
        'was_multiplied' => (float)(pu_row($conn,'SELECT multiplier FROM student_xp_awards WHERE submission_id=?',[$submissionId])['multiplier'] ?? 1) > 1,

        'submission_id' =>
            $submissionId

    ]);


    $stmt->close();

    $conn->close();


} catch (Throwable $e) {
    if (isset($conn)) $conn->rollback();

    http_response_code($e->getCode()>=400 && $e->getCode()<=599 ? $e->getCode() : 500);

    echo json_encode([

        'success' => false,

        'message' =>
            'Failed to submit quiz.',

        'error' =>
            $e->getMessage()

    ]);

}
