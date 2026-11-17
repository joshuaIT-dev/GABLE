<?php

session_start();

header('Content-Type: application/json');

require_once 'config.php';
require_once __DIR__ . '/platform_guard.php';
platform_block_students_if_maintenance(); // Maintenance Mode (students only)


/*
|--------------------------------------------------------------------------
| GET LOGGED-IN STUDENT
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

        'message' => 'Student session not found.'

    ]);

    exit;

}


try {

    $conn = getConnection();
    require_once __DIR__.'/powerup_service.php';
    if ($_SERVER['REQUEST_METHOD']==='POST') {
        if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')!==0) throw new RuntimeException('JSON required.');
        $input=json_decode(file_get_contents('php://input'),true) ?: [];
        if (!empty($input['notification_id'])) pu_query($conn,'UPDATE student_system_notifications SET is_read=1 WHERE student_id=? AND notification_id=?',[$studentId,(int)$input['notification_id']]);
        elseif (!empty($input['system_all'])) pu_query($conn,'UPDATE student_system_notifications SET is_read=1 WHERE student_id=?',[$studentId]);
        else pu_query($conn,'INSERT IGNORE INTO student_quiz_notification_reads(student_id,quiz_id) VALUES (?,?)',[$studentId,(int)($input['quiz_id'] ?? 0)]);
        echo json_encode(['success'=>true]); exit;
    }



    /*
    |--------------------------------------------------------------------------
    | GET STUDENT SECTION
    |--------------------------------------------------------------------------
    */

    $studentSql = "
    SELECT program, year_level, block
    FROM student
    WHERE student_id = ?
    LIMIT 1
";


    $studentStmt = $conn->prepare($studentSql);


    if (!$studentStmt) {

        throw new Exception($conn->error);

    }


    $studentStmt->bind_param(
        "i",
        $studentId
    );


    $studentStmt->execute();


    $studentResult =
        $studentStmt->get_result();


    $student =
        $studentResult->fetch_assoc();


    $studentStmt->close();


    if (!$student) {

        throw new Exception(
            'Student information not found.'
        );

    }


    $studentSection =
    trim($student['program']) . ' ' .
    trim($student['year_level']) .
    trim($student['block']);


    /*
    |--------------------------------------------------------------------------
    | GET ACTIVE QUIZZES FOR THIS STUDENT
    |--------------------------------------------------------------------------
    */

    $sql = "

        SELECT

            q.quiz_id,

            q.title,

            q.subject,

            q.section,

            q.mode,

            q.quiz_type,

            q.due_date,

            q.created_at,

            q.xp_reward,

            r.is_read

        FROM quizzes q

        LEFT JOIN student_quiz_notification_reads r

            ON r.quiz_id = q.quiz_id

            AND r.student_id = ?

        WHERE

    q.status = 'active'

AND (

    LOWER(TRIM(q.section))
        = LOWER(TRIM(?))

    OR

    LOWER(TRIM(q.section))
        = LOWER(
            CONCAT(
                'Section ',
                TRIM(?)
            )
        )

)

        ORDER BY

            q.created_at DESC

    ";


    $stmt =
        $conn->prepare($sql);


    if (!$stmt) {

        throw new Exception(
            $conn->error
        );

    }


    $stmt->bind_param(

    "iss",

    $studentId,

    $studentSection,

    $studentSection

);


    $stmt->execute();


    $result =
        $stmt->get_result();


    $notifications = [];


    while (

        $row =
        $result->fetch_assoc()

    ) {

        $notifications[] = [

            'id' =>
                (int)$row['quiz_id'],

            'quiz_id' =>
                (int)$row['quiz_id'],

            'title' =>
                'New Quiz Posted',

            'message' =>

                $row['title']

                . ' has been posted for '

                . $row['subject']

                . '.',

            'quiz_title' =>
                $row['title'],

            'subject' =>
                $row['subject'],

            'section' =>
                $row['section'],

            'mode' =>
                $row['mode'],

            'quiz_type' =>
                $row['quiz_type'],

            'due_date' =>
                $row['due_date'],

            'xp_reward' =>
                (int)$row['xp_reward'],

            'created_at' =>
                $row['created_at'],

            'is_read' =>

                $row['is_read'] !== null

        ];

    }


    $stmt->close();

    $system=pu_query($conn,"SELECT notification_id,quiz_id,title,message,created_at,is_read,'system' AS notification_type,'System' AS instructor_name FROM student_system_notifications WHERE student_id=? ORDER BY notification_id DESC LIMIT 100",[$studentId])->get_result()->fetch_all(MYSQLI_ASSOC);
    $notifications=array_merge($system,$notifications);
    $conn->close();


    echo json_encode([

        'success' => true,

        'notifications' =>
            $notifications

    ]);


} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([

        'success' => false,

        'message' =>
            'Failed to load quiz notifications.',

        'error' =>
            $e->getMessage()

    ]);

}