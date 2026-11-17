<?php

/*
|--------------------------------------------------------------------------
| STUDENT LEADERBOARDS
|--------------------------------------------------------------------------
*/

session_start();

header('Content-Type: application/json');

require_once 'config.php';


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
| OPTIONAL SUBJECT FILTER
|--------------------------------------------------------------------------
*/

$subject =
    isset($_GET['subject'])
        ? trim($_GET['subject'])
        : '';


try {

    $conn = getConnection();

    $conn->set_charset('utf8mb4');

    $conn->query(
        "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    );


    /*
    |--------------------------------------------------------------------------
    | GET LOGGED-IN STUDENT
    |--------------------------------------------------------------------------
    */

    $studentSql = "
        SELECT
            student_id,
            student_number,
            first_name,
            last_name,
            college,
            program,
            year_level,
            block
        FROM student
        WHERE student_id = ?
        LIMIT 1
    ";

    $studentStmt = $conn->prepare($studentSql);

    if (!$studentStmt) {
        throw new Exception($conn->error);
    }

    $studentStmt->bind_param("i", $studentId);

    $studentStmt->execute();

    $studentResult = $studentStmt->get_result();

    $currentStudent = $studentResult->fetch_assoc();

    $studentStmt->close();


    if (!$currentStudent) {

        throw new Exception(
            'Student not found.'
        );

    }


    /*
    |--------------------------------------------------------------------------
    | LOGGED-IN STUDENT INFORMATION
    |--------------------------------------------------------------------------
    */

    $program =
        trim(
            $currentStudent['program'] ?? ''
        );

    $yearLevel =
        trim(
            (string)($currentStudent['year_level'] ?? '')
        );

    $block =
        trim(
            $currentStudent['block'] ?? ''
        );

        /*
        |--------------------------------------------------------------------------
        | GET LEADERBOARD
        |--------------------------------------------------------------------------
        |
        | If no subject is selected:
        |     Return overall leaderboard.
        |
        | If a subject is selected:
        |     Return students who receive quizzes
        |     for that subject and calculate their
        |     performance only from quizzes belonging
        |     to that subject.
        |
        |--------------------------------------------------------------------------
        */

    if ($subject === '') {

    /*
    |--------------------------------------------------------------------------
    | OVERALL LEADERBOARD
    |--------------------------------------------------------------------------
    */

    $sql = "

        SELECT

            s.student_id,

            s.student_number,

            s.first_name,

            s.last_name,

            s.program,

            s.year_level,

            s.block,


            COALESCE(
                SUM(qs.xp_earned),
                0
            ) + (SELECT COALESCE(SUM(g.bonus),0) FROM student_powerup_grants g WHERE g.student_id=s.student_id) AS total_xp,


            COALESCE(
                AVG(qs.score),
                0
            ) AS avg_score,


            COUNT(
                qs.submission_id
            ) AS submissions_count


        FROM student s


        LEFT JOIN quiz_IDsubmissions qs

            ON qs.student_id =
               s.student_id


        GROUP BY

            s.student_id,

            s.student_number,

            s.first_name,

            s.last_name,

            s.program,

            s.year_level,

            s.block


        ORDER BY

            total_xp DESC,

            avg_score DESC,

            s.last_name ASC,

            s.first_name ASC

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


} else {

    /*
    |--------------------------------------------------------------------------
    | SUBJECT LEADERBOARD
    |--------------------------------------------------------------------------
    |
    | A student is considered enrolled in the
    | subject if their section receives a quiz
    | for that subject.
    |
    */

    $sql = "

        SELECT

            s.student_id,

            s.student_number,

            s.first_name,

            s.last_name,

            s.program,

            s.year_level,

            s.block,


            COALESCE(
                SUM(qs.xp_earned),
                0
            ) + (SELECT COALESCE(SUM(g.bonus),0) FROM student_powerup_grants g WHERE g.student_id=s.student_id) AS total_xp,


            COALESCE(
                AVG(qs.score),
                0
            ) AS avg_score,


            COUNT(
                qs.submission_id
            ) AS submissions_count


        FROM student s


        /*
        |--------------------------------------------------------------------------
        | ONLY STUDENTS WHO RECEIVE A QUIZ
        | FOR THIS SUBJECT
        |--------------------------------------------------------------------------
        */

        INNER JOIN (

            SELECT DISTINCT

                TRIM(section) AS section

            FROM quizzes

            WHERE

                LOWER(
                    TRIM(subject)
                ) = LOWER(
                    TRIM(?)
                )

                AND status = 'active'

        ) enrolled_sections

            ON LOWER(
                TRIM(
                    CONCAT(
                        s.program,
                        ' ',
                        s.year_level,
                        s.block
                    )
                )
            )

              =
            LOWER(
                TRIM(
                    enrolled_sections.section
                )
            ) COLLATE utf8mb4_unicode_ci


        /*
        |--------------------------------------------------------------------------
        | GET ONLY SUBMISSIONS FOR THIS SUBJECT
        |--------------------------------------------------------------------------
        */

       LEFT JOIN (

            quiz_IDsubmissions qs

            INNER JOIN quizzes q

                ON q.quiz_id =
                   qs.quiz_id

                AND LOWER(
                    TRIM(q.subject)
                ) = LOWER(
                    TRIM(?)
                )

        )

            ON qs.student_id =
               s.student_id


        /*
        |--------------------------------------------------------------------------
        | IMPORTANT:
        |
        | The submission should only count if
        | the quiz itself belongs to this subject.
        |--------------------------------------------------------------------------
        */

        GROUP BY

            s.student_id,

            s.student_number,

            s.first_name,

            s.last_name,

            s.program,

            s.year_level,

            s.block


        ORDER BY

            avg_score DESC,

            total_xp DESC,

            s.last_name ASC,

            s.first_name ASC

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
        "ss",
        $subject,
        $subject
    );

}

    $stmt->execute();

    $result = $stmt->get_result();


    $students = [];


    while ($row = $result->fetch_assoc()) {

        $fullName =
            trim(
                ($row['first_name'] ?? '')
                . ' '
                . ($row['last_name'] ?? '')
            );


        $studentProgram =
            trim(
                $row['program'] ?? ''
            );


        $studentYear =
            trim(
                (string)($row['year_level'] ?? '')
            );


        $studentBlock =
            trim(
                $row['block'] ?? ''
            );


        /*
        |--------------------------------------------------------------------------
        | CREATE CONSISTENT SECTION NAME
        |--------------------------------------------------------------------------
        |
        | Example:
        |
        | BSIT + 1 + A
        |
        | = BSIT 1A
        |
        */

        $section =
            trim(
                $studentProgram
                . ' '
                . $studentYear
                . $studentBlock
            );


        $students[] = [

            /*
            | Use student number because
            | student.js uses student_number
            | as studentProfile.id.
            */

            'id' =>
                (string)
                $row['student_number'],


            'student_id' =>
                (int)
                $row['student_id'],


            'name' =>
                $fullName,


            'program' =>
                $studentProgram,


            'year_level' =>
                (int)
                $row['year_level'],


            'block' =>
                $studentBlock,


            'section' =>
                $section,


            'xp' =>
                (int)
                $row['total_xp'],


            'score' =>
                round(
                    (float)
                    $row['avg_score'],
                    2
                ),


            'submissions' =>
                (int)
                $row['submissions_count']

        ];

    }


    $stmt->close();

    $conn->close();


    /*
    |--------------------------------------------------------------------------
    | RETURN RESULT
    |--------------------------------------------------------------------------
    */

    echo json_encode([

        'success' => true,

        'student' => [

            'id' =>
                (int)
                $currentStudent['student_id'],

            'student_number' =>
                $currentStudent['student_number'],

            'program' =>
                $program,

            'year_level' =>
                (int)
                $yearLevel,

            'block' =>
                $block,

            'section' =>
                trim(
                    $program
                    . ' '
                    . $yearLevel
                    . $block
                )

        ],

        'students' =>
            $students

    ]);


} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([

        'success' => false,

        'message' =>
            'Failed to load student leaderboard.',

        'error' =>
            $e->getMessage()

    ]);

}
