<?php

session_start();

header(
    'Content-Type: application/json'
);

require_once 'config.php';


/*
|--------------------------------------------------------------------------
| CHECK INSTRUCTOR SESSION
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

        'message' =>
            'Instructor session not found.'

    ]);

    exit;

}


try {

    $conn =
        getConnection();


    if ($_SERVER['REQUEST_METHOD']==='POST') {
        if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')!==0) throw new RuntimeException('JSON required.');
        $input=json_decode(file_get_contents('php://input'),true) ?: [];
        $id=(int)($input['notification_id'] ?? 0);
        $read=$conn->prepare('UPDATE instructor_notifications SET is_read=1 WHERE instructor_id=? AND notification_id=?');
        $read->bind_param('ii',$instructorId,$id); $read->execute();
        echo json_encode(['success'=>true]); exit;
    }

    /*
    |--------------------------------------------------------------------------
    | GET INSTRUCTOR NOTIFICATIONS
    |--------------------------------------------------------------------------
    */

    $sql = "

        SELECT

            notification_id,

            student_id,

            quiz_id,

            submission_id,

            type,

            title,

            message,

            is_read,

            created_at

        FROM instructor_notifications

        WHERE instructor_id = ?

        ORDER BY created_at DESC

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

        "i",

        $instructorId

    );


    $stmt->execute();


    $result =
        $stmt
            ->get_result();


    $notifications =
        [];


    while (

        $row =
        $result->fetch_assoc()

    ) {

        $notifications[] = [

            'id' =>
                (string)$row[
                    'notification_id'
                ],

            'type' =>
                $row[
                    'type'
                ],

            'title' =>
                $row[
                    'title'
                ],

            'desc' =>
                $row[
                    'message'
                ],

            'time' =>

                strtotime(

                    $row[
                        'created_at'
                    ]

                ) * 1000,

            'read' =>

                (bool)$row[
                    'is_read'
                ],

            'priority' =>
                'Normal',

            'quizId' =>
                (int)$row[
                    'quiz_id'
                ],

            'submissionId' =>
                (int)$row[
                    'submission_id'
                ]

        ];

    }


    echo json_encode([

        'success' => true,

        'notifications' =>
            $notifications

    ]);


    $stmt->close();

    $conn->close();


} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([

        'success' => false,

        'message' =>
            'Failed to load notifications.',

        'error' =>
            $e->getMessage()

    ]);

}