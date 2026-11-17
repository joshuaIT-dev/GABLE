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
| CONNECT TO DATABASE
|--------------------------------------------------------------------------
*/

$conn = getConnection();


/*
|--------------------------------------------------------------------------
| GET FLAGS BELONGING TO THIS INSTRUCTOR'S QUIZZES
|--------------------------------------------------------------------------
*/

$sql = "
    SELECT
        f.flag_id,
        f.quiz_id,
        f.student_id,
        f.question_index,
        f.reason,
        f.status,
        f.created_at,
        f.resolved_at,
        f.resolved_by,

        s.first_name,
        s.last_name,
        s.block,

        q.title AS quiz_title

    FROM flags f

    INNER JOIN student s
        ON f.student_id = s.student_id

    INNER JOIN quizzes q
        ON f.quiz_id = q.quiz_id

    WHERE q.instructor_id = ?

    ORDER BY f.created_at DESC
";


$stmt = $conn->prepare($sql);


if (!$stmt) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Failed to prepare database query.'
    ]);

    exit;
}


$stmt->bind_param(
    'i',
    $instructor_id
);


$stmt->execute();

$result = $stmt->get_result();


/*
|--------------------------------------------------------------------------
| BUILD FLAGS ARRAY
|--------------------------------------------------------------------------
*/

$flags = [];


while ($row = $result->fetch_assoc()) {

    $studentName =
        trim(
            $row['first_name'] . ' ' . $row['last_name']
        );


    $flags[] = [

        'id' =>
            (string)$row['flag_id'],

        'quizId' =>
            (int)$row['quiz_id'],

        'studentId' =>
            (int)$row['student_id'],

        'questionIndex' =>
            (int)$row['question_index'],

        'reason' =>
            $row['reason'],

        'status' =>
            $row['status'],

        'studentName' =>
            $studentName,

        'studentSection' =>
            $row['block'] ?? '',

        'quizTitle' =>
            $row['quiz_title'],

        'time' =>
            strtotime($row['created_at']) * 1000,

        'resolvedAt' =>
            $row['resolved_at'],

        'resolvedBy' =>
            $row['resolved_by']

    ];
}


/*
|--------------------------------------------------------------------------
| RESPONSE
|--------------------------------------------------------------------------
*/

echo json_encode([

    'success' => true,

    'flags' => $flags

]);


$stmt->close();

$conn->close();