<?php

session_start();

header('Content-Type: application/json');

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
        'message' => 'Instructor session not found. Please log in again.'
    ]);

    exit;

}


/*
|--------------------------------------------------------------------------
| GET REQUEST ONLY
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;

}


try {

    $conn = getConnection();


    /*
    |--------------------------------------------------------------------------
    | GET STUDENTS ASSIGNED TO THIS INSTRUCTOR
    |--------------------------------------------------------------------------
    |
    | Match:
    |
    | teaching_assignments.section
    |
    | Example:
    | BSIT 1A
    |
    | With:
    |
    | student.program     = BSIT
    | student.year_level  = 1
    | student.block       = A
    |
    */

    $sql = "

        SELECT

            s.student_id,

            s.student_number,

            s.institutional_email,

            s.first_name,

            s.last_name,

            s.college,

            s.program,

            s.year_level,

            s.block,


            /*
            ------------------------------------------------------
            | AVERAGE QUIZ SCORE
            ------------------------------------------------------
            */

            COALESCE(
                AVG(qs.score),
                0
            ) AS avg_score,

            AVG(
                CASE
                    WHEN LOWER(q.mode) = 'formal'
                    THEN qs.score
                END
            ) AS formal_avg,

            AVG(
                CASE
                    WHEN LOWER(q.mode) = 'informal'
                    THEN qs.score
                END
            ) AS informal_avg,


            /*
            ------------------------------------------------------
            | TOTAL XP
            ------------------------------------------------------
            */

            COALESCE(
                SUM(CASE WHEN qs.submission_id > (SELECT submission_cutoff FROM current_xp_semester) AND qs.status IN ('submitted','graded') THEN qs.xp_earned ELSE 0 END),
                0
            ) + (SELECT COALESCE(SUM(g.bonus),0) FROM student_powerup_grants g WHERE g.student_id=s.student_id) AS total_xp,
            (SELECT lifetime_xp FROM student_reward_progress WHERE student_id=s.student_id) AS level_xp,


            /*
            ------------------------------------------------------
            | NUMBER OF SUBMISSIONS
            ------------------------------------------------------
            */

            COUNT(qs.submission_id)
            AS submissions_count


        FROM student s


        /*
        ----------------------------------------------------------
        | ONLY STUDENTS IN THE INSTRUCTOR'S ASSIGNED SECTIONS
        ----------------------------------------------------------
        */

        INNER JOIN teaching_assignments ta

    ON ta.instructor_id = ?

    AND ta.section COLLATE utf8mb4_general_ci =
        CONCAT(
            s.program,
            ' ',
            s.year_level,
            s.block
        ) COLLATE utf8mb4_general_ci


        /*
        ----------------------------------------------------------
        | GET QUIZZES BELONGING TO THIS INSTRUCTOR
        ----------------------------------------------------------
        */

        LEFT JOIN quizzes q

    ON q.instructor_id = ?

    AND q.section COLLATE utf8mb4_general_ci =
        ta.section COLLATE utf8mb4_general_ci


        /*
        ----------------------------------------------------------
        | GET STUDENT SUBMISSIONS
        ----------------------------------------------------------
        */

        LEFT JOIN quiz_IDsubmissions qs

            ON qs.quiz_id = q.quiz_id

            AND qs.student_id = s.student_id


        GROUP BY

            s.student_id,

            s.student_number,

            s.institutional_email,

            s.first_name,

            s.last_name,

            s.college,

            s.program,

            s.year_level,

            s.block


        ORDER BY

            avg_score DESC,

            total_xp DESC,

            s.last_name ASC

    ";


    $stmt =
        $conn->prepare($sql);


    if (!$stmt) {

        throw new Exception(
            $conn->error
        );

    }


    $stmt->bind_param(

        "ii",

        $instructorId,

        $instructorId

    );


    $stmt->execute();


    $result =
        $stmt->get_result();


    $students = [];


    $rank = 1;


    while (

        $row =
        $result->fetch_assoc()

    ) {


        $fullName =

            trim(

                ($row['first_name'] ?? '')
                . ' '
                . ($row['last_name'] ?? '')

            );


        $section =

            trim(

                ($row['program'] ?? '')
                . ' '
                . ($row['year_level'] ?? '')
                . ($row['block'] ?? '')

            );


        $students[] = [

            'student_id' =>

                (int)$row['student_id'],


            /*
            | instructor.js currently uses:
            | s.id
            */

            'id' =>

                (string)$row['student_number'],


            'name' =>

                $fullName,


            'email' =>

                $row['institutional_email'],


            'college' =>

                $row['college'],


            'program' =>

                $row['program'],


            'year_level' =>

                (int)$row['year_level'],


            'block' =>

                $row['block'],


            /*
            | Full section:
            | Example: BSIT 1A
            */

            'section' =>

                $section,


            'score' =>

                round(

                    (float)$row['avg_score'],

                    2

                ),


            'level_xp' => (int)$row['level_xp'],

            'xp' =>

                (int)$row['total_xp'],


            'submissions' =>

                (int)$row['submissions_count'],


            'rank' =>

                $rank++,
            
            'formal_avg' =>

                $row['formal_avg'] !== null
                    ? round((float)$row['formal_avg'], 2)
                    : null,

            'informal_avg' =>

                    $row['informal_avg'] !== null
                        ? round((float)$row['informal_avg'], 2)
                        : null

        ];

    }


    $stmt->close();

    $conn->close();


    echo json_encode([

        'success' => true,

        'students' => $students

    ]);


} catch (Throwable $e) {


    http_response_code(500);


    echo json_encode([

        'success' => false,

        'message' =>

            'Failed to load instructor students.',

        'error' =>

            $e->getMessage()

    ]);

}