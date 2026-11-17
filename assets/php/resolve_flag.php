<?php

session_start();

require 'config.php';

header('Content-Type: application/json');


/*
|--------------------------------------------------------------------------
| CHECK INSTRUCTOR SESSION
|--------------------------------------------------------------------------
*/

if (!isset($_SESSION['instructor'])) {

    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Not logged in.'
    ]);

    exit;
}


$instructor_id = $_SESSION['instructor'];


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
| GET FLAG ID
|--------------------------------------------------------------------------
*/

$data = json_decode(
    file_get_contents('php://input'),
    true
);

$flag_id = $data['flag_id'] ?? null;


if (!$flag_id) {

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => 'Flag ID is required.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| CONNECT TO DATABASE
|--------------------------------------------------------------------------
*/

$conn = getConnection();


/*
|--------------------------------------------------------------------------
| VERIFY FLAG BELONGS TO THIS INSTRUCTOR
|--------------------------------------------------------------------------
*/

$stmt = $conn->prepare("
    SELECT
        f.flag_id
    FROM flags f

    INNER JOIN quizzes q
        ON f.quiz_id = q.quiz_id

    WHERE f.flag_id = ?
      AND q.instructor_id = ?

    LIMIT 1
");


$stmt->bind_param(
    'ii',
    $flag_id,
    $instructor_id
);


$stmt->execute();

$result = $stmt->get_result();


if ($result->num_rows === 0) {

    http_response_code(404);

    echo json_encode([
        'success' => false,
        'message' => 'Flag not found or you do not have permission to resolve it.'
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


$stmt->close();


/*
|--------------------------------------------------------------------------
| RESOLVE FLAG
|--------------------------------------------------------------------------
*/

$stmt = $conn->prepare("
    UPDATE flags
    SET
        status = 'resolved',
        resolved_at = NOW(),
        resolved_by = ?
    WHERE flag_id = ?
");


$stmt->bind_param(
    'ii',
    $instructor_id,
    $flag_id
);


if (!$stmt->execute()) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Failed to resolve flag.'
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


/*
|--------------------------------------------------------------------------
| SUCCESS
|--------------------------------------------------------------------------
*/

echo json_encode([
    'success' => true,
    'message' => 'Flag resolved successfully.'
]);


$stmt->close();
$conn->close();