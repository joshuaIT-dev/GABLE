<?php

/*
|--------------------------------------------------------------------------
| FOR Instructor Analytics Dashboard
|--------------------------------------------------------------------------
*/

session_start();

header('Content-Type: application/json');

require_once 'config.php';


/*
|--------------------------------------------------------------------------
| GET LOGGED-IN INSTRUCTOR
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


try {

    $conn = getConnection();


    /*
    |--------------------------------------------------------------------------
    | 1. ACTIVE STUDENTS + SECTIONS
    |--------------------------------------------------------------------------
    */

    $studentSql = "

        SELECT

            COUNT(DISTINCT s.student_id)
                AS active_students,

            COUNT(DISTINCT ta.section)
                AS sections

        FROM teaching_assignments ta

        INNER JOIN student s

    ON ta.section COLLATE utf8mb4_general_ci =
       CONCAT(
           s.program,
           ' ',
           s.year_level,
           s.block
       ) COLLATE utf8mb4_general_ci

        WHERE ta.instructor_id = ?

    ";

    $studentStmt =
        $conn->prepare($studentSql);

    if (!$studentStmt) {
        throw new Exception($conn->error);
    }

    $studentStmt->bind_param(
        "i",
        $instructorId
    );

    $studentStmt->execute();

    $studentResult =
        $studentStmt->get_result();

    $studentStats =
        $studentResult->fetch_assoc()
        ?? [];



    /*
    |--------------------------------------------------------------------------
    | 2. ASSIGNED QUIZZES + SUBJECTS
    |--------------------------------------------------------------------------
    */

    $quizSql = "

        SELECT

            COUNT(*) AS assigned_quizzes,

            COUNT(
                DISTINCT NULLIF(
                    TRIM(subject),
                    ''
                )
            ) AS subjects

        FROM quizzes

        WHERE instructor_id = ?

        AND status = 'active'

    ";

    $quizStmt =
        $conn->prepare($quizSql);

    if (!$quizStmt) {
        throw new Exception($conn->error);
    }

    $quizStmt->bind_param(
        "i",
        $instructorId
    );

    $quizStmt->execute();

    $quizResult =
        $quizStmt->get_result();

    $quizStats =
        $quizResult->fetch_assoc()
        ?? [];



    /*
    |--------------------------------------------------------------------------
    | 3. EXPECTED QUIZ ASSIGNMENTS
    |--------------------------------------------------------------------------
    |
    | Every student in a quiz's section is one expected
    | completion.
    |
    */

    $expectedSql = "

        SELECT COUNT(*) AS expected_assignments

        FROM (

            SELECT DISTINCT

                q.quiz_id,

                s.student_id

            FROM quizzes q

           INNER JOIN student s

    ON q.section COLLATE utf8mb4_general_ci =
       CONCAT(
           s.program,
           ' ',
           s.year_level,
           s.block
       ) COLLATE utf8mb4_general_ci

            WHERE q.instructor_id = ?

            AND q.status = 'active'

        ) AS expected

    ";

    $expectedStmt =
        $conn->prepare($expectedSql);

    if (!$expectedStmt) {
        throw new Exception($conn->error);
    }

    $expectedStmt->bind_param(
        "i",
        $instructorId
    );

    $expectedStmt->execute();

    $expectedResult =
        $expectedStmt->get_result();

    $expectedStats =
        $expectedResult->fetch_assoc()
        ?? [];



    /*
    |--------------------------------------------------------------------------
    | 4. COMPLETED QUIZ ASSIGNMENTS
    |--------------------------------------------------------------------------
    |
    | DISTINCT quiz + student prevents multiple submission
    | records from inflating the completion percentage.
    |
    */

    $completedSql = "

        SELECT COUNT(*) AS completed_assignments

        FROM (

            SELECT DISTINCT

                qs.quiz_id,

                qs.student_id

            FROM quiz_IDsubmissions qs

            INNER JOIN quizzes q

                ON q.quiz_id = qs.quiz_id

            INNER JOIN student s

    ON s.student_id = qs.student_id

    AND q.section COLLATE utf8mb4_general_ci =
        CONCAT(
            s.program,
            ' ',
            s.year_level,
            s.block
        ) COLLATE utf8mb4_general_ci

            WHERE q.instructor_id = ?

            AND q.status = 'active'

        ) AS completed

    ";

    $completedStmt =
        $conn->prepare($completedSql);

    if (!$completedStmt) {
        throw new Exception($conn->error);
    }

    $completedStmt->bind_param(
        "i",
        $instructorId
    );

    $completedStmt->execute();

    $completedResult =
        $completedStmt->get_result();

    $completedStats =
        $completedResult->fetch_assoc()
        ?? [];



    /*
    |--------------------------------------------------------------------------
    | 5. COMPLETION RATE
    |--------------------------------------------------------------------------
    */

    $expected =
        (int)($expectedStats['expected_assignments'] ?? 0);

    $completed =
        (int)($completedStats['completed_assignments'] ?? 0);

    if ($expected > 0) {

        $completionRate =
            round(
                ($completed / $expected) * 100,
                1
            );

    } else {

        $completionRate = 0;

    }



    /*
    |--------------------------------------------------------------------------
    | 6. PENDING SUBMISSIONS
    |--------------------------------------------------------------------------
    |
    | These are used as instructor dashboard notifications.
    |
    */

    $pendingSql = "

        SELECT COUNT(*) AS pending_submissions

        FROM quiz_IDsubmissions qs

        INNER JOIN quizzes q

            ON q.quiz_id = qs.quiz_id

        WHERE q.instructor_id = ?

        AND (
            qs.status = 'pending_review'
            OR qs.status = 'submitted'
        )

    ";

    $pendingStmt =
        $conn->prepare($pendingSql);

    if (!$pendingStmt) {
        throw new Exception($conn->error);
    }

    $pendingStmt->bind_param(
        "i",
        $instructorId
    );

    $pendingStmt->execute();

    $pendingResult =
        $pendingStmt->get_result();

    $pendingStats =
        $pendingResult->fetch_assoc()
        ?? [];



    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    echo json_encode([

        'success' => true,

        'stats' => [

            'active_students' =>
                (int)(
                    $studentStats['active_students']
                    ?? 0
                ),

            'sections' =>
                (int)(
                    $studentStats['sections']
                    ?? 0
                ),

            'assigned_quizzes' =>
                (int)(
                    $quizStats['assigned_quizzes']
                    ?? 0
                ),

            'subjects' =>
                (int)(
                    $quizStats['subjects']
                    ?? 0
                ),

            'expected_assignments' =>
                $expected,

            'completed_assignments' =>
                $completed,

            'completion_rate' =>
                $completionRate,

            'pending_submissions' =>
                (int)(
                    $pendingStats['pending_submissions']
                    ?? 0
                )

        ]

    ]);


    /*
    |--------------------------------------------------------------------------
    | CLOSE
    |--------------------------------------------------------------------------
    */

    $studentStmt->close();
    $quizStmt->close();
    $expectedStmt->close();
    $completedStmt->close();
    $pendingStmt->close();

    $conn->close();


} catch (Throwable $e) {
    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Failed to load instructor dashboard statistics.',
        'error' => $e->getMessage()
    ]);
}