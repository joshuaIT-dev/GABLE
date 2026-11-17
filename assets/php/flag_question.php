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

$studentId = $_SESSION['student'] ?? null;

if (!$studentId) {

    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Student session not found.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| CHECK REQUEST METHOD
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
| READ JSON DATA
|--------------------------------------------------------------------------
*/

$input = json_decode(
    file_get_contents('php://input'),
    true
);


$quizId = (int)($input['quiz_id'] ?? 0);

$questionIndex =
    (int)($input['question_index'] ?? -1);

$reason =
    trim($input['reason'] ?? '');


/*
|--------------------------------------------------------------------------
| VALIDATE QUIZ ID
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


/*
|--------------------------------------------------------------------------
| VALIDATE QUESTION INDEX
|--------------------------------------------------------------------------
*/

if ($questionIndex < 0) {

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => 'Invalid question.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| DEFAULT REASON
|--------------------------------------------------------------------------
*/

if ($reason === '') {

    $reason =
        'Flagged by student during quiz.';
}


/*
|--------------------------------------------------------------------------
| CONNECT TO DATABASE
|--------------------------------------------------------------------------
*/

$conn = getConnection();


try {

    /*
    |--------------------------------------------------------------------------
    | CHECK IF THIS QUESTION WAS ALREADY FLAGGED
    |--------------------------------------------------------------------------
    */

    $checkSql = "
        SELECT flag_id
        FROM flags
        WHERE quiz_id = ?
          AND student_id = ?
          AND question_index = ?
          AND status = 'pending'
        LIMIT 1
    ";

    $checkStmt = $conn->prepare($checkSql);

    if (!$checkStmt) {
        throw new Exception($conn->error);
    }

    $checkStmt->bind_param(
        "iii",
        $quizId,
        $studentId,
        $questionIndex
    );

    $checkStmt->execute();

    $checkResult =
        $checkStmt->get_result();


    /*
    |--------------------------------------------------------------------------
    | ALREADY FLAGGED
    |--------------------------------------------------------------------------
    */

    if ($checkResult->num_rows > 0) {

        $existing =
            $checkResult->fetch_assoc();

        echo json_encode([
            'success' => true,
            'message' => 'Question is already flagged.',
            'flag_id' => $existing['flag_id']
        ]);

        $checkStmt->close();
        $conn->close();

        exit;
    }

    $checkStmt->close();


    /*
    |--------------------------------------------------------------------------
    | INSERT NEW FLAG
    |--------------------------------------------------------------------------
    */

    $sql = "
        INSERT INTO flags (
            quiz_id,
            student_id,
            question_index,
            reason,
            status
        )
        VALUES (?, ?, ?, ?, 'pending')
    ";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception($conn->error);
    }


    $stmt->bind_param(
        "iiis",
        $quizId,
        $studentId,
        $questionIndex,
        $reason
    );


    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }


    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    echo json_encode([
        'success' => true,
        'message' => 'Question flagged successfully.',
        'flag_id' => $stmt->insert_id
    ]);


    $stmt->close();
    $conn->close();


} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Failed to flag question.',
        'error' => $e->getMessage()
    ]);

    if (isset($conn)) {
        $conn->close();
    }
}