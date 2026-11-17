<?php

session_start();

header('Content-Type: application/json');

require_once 'config.php';


/*
|--------------------------------------------------------------------------
| CHECK INSTRUCTOR LOGIN
|--------------------------------------------------------------------------
*/

$instructorId =
    $_SESSION['instructor']
    ?? $_SESSION['instructor_id']
    ?? null;


if (!$instructorId) {

    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Instructor session not found.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| ONLY POST
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


$input =
    json_decode(
        file_get_contents('php://input'),
        true
    );


$questionId =
    isset($input['question_id'])
        ? (int)$input['question_id']
        : 0;


if ($questionId <= 0) {

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => 'Invalid question ID.'
    ]);

    exit;
}


$conn =
    getConnection();


/*
|--------------------------------------------------------------------------
| DELETE ONLY THIS INSTRUCTOR'S QUESTION
|--------------------------------------------------------------------------
*/

$stmt =
    $conn->prepare("
        DELETE FROM game_questions
        WHERE question_id = ?
          AND instructor_id = ?
    ");


$stmt->bind_param(
    'ii',
    $questionId,
    $instructorId
);


$stmt->execute();


if ($stmt->affected_rows === 0) {

    http_response_code(404);

    echo json_encode([
        'success' => false,
        'message' => 'Question not found.'
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


$stmt->close();
$conn->close();


echo json_encode([
    'success' => true,
    'message' => 'Question deleted successfully.'
]);