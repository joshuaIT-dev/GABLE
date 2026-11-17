
<?php

$gameSession = ($_GET['game'] ?? '') === '1';
$gameTab = strtolower((string)($_GET['tab'] ?? ''));
if ($gameSession) session_name('GABLE_GAME');
session_start();

require_once 'config.php';

header('Content-Type: application/json');

/*
|--------------------------------------------------------------------------
| CHECK INSTRUCTOR SESSION
|--------------------------------------------------------------------------
*/

$instructor_id =
    ($gameSession ? ($_SESSION['game_tabs'][$gameTab]['instructor'] ?? null) : ($_SESSION['instructor'] ?? $_SESSION['instructor_id'] ?? null));

if (($gameSession && (!preg_match('/^[a-f0-9]{64}$/', $gameTab) || empty($_SESSION['game_tabs'][$gameTab]))) || (!$gameSession && !$instructor_id)) {

    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "Not Logged In"
    ]);

    exit;
}

try {

    $conn = getConnection();

    /*
    |--------------------------------------------------------------------------
    | GET INSTRUCTOR ASSIGNMENTS
    |--------------------------------------------------------------------------
    |
    | average_score:
    | Average of actual submitted quiz scores
    | for the assigned subject and section.
    |
    | student_count:
    | Total students registered in the section.
    |
    */

    $sql = "

        SELECT

            ta.assignment_id,

            ta.subject_name,

            ta.section,

            ta.section AS section_label,

            ta.assignment_type,


            /*
            |--------------------------------------------------------------------------
            | CLASS AVERAGE
            |--------------------------------------------------------------------------
            */

            COALESCE(

                (

                    SELECT AVG(qs.score)

                    FROM quizzes q

                    INNER JOIN quiz_IDsubmissions qs

                        ON qs.quiz_id = q.quiz_id

                    WHERE

                        q.instructor_id = ta.instructor_id

                        AND TRIM(q.subject) COLLATE utf8mb4_general_ci =
                            TRIM(ta.subject_name) COLLATE utf8mb4_general_ci

                        AND TRIM(q.section) COLLATE utf8mb4_general_ci =
                            TRIM(ta.section) COLLATE utf8mb4_general_ci

                        AND qs.score IS NOT NULL

                ),

                0

            ) AS average_score,


            /*
            |--------------------------------------------------------------------------
            | TOTAL STUDENTS IN SECTION
            |--------------------------------------------------------------------------
            */

            (

                SELECT COUNT(DISTINCT s.student_id)

                FROM student s

                WHERE

                    CONCAT(

                        s.program,

                        ' ',

                        s.year_level,

                        s.block

                    ) COLLATE utf8mb4_general_ci =

                    TRIM(ta.section) COLLATE utf8mb4_general_ci

            ) AS student_count


        FROM teaching_assignments ta

        WHERE ta.instructor_id = ?

        ORDER BY ta.assignment_id ASC

    ";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception($conn->error);
    }

    $stmt->bind_param("i", $instructor_id);

    $stmt->execute();

    $result = $stmt->get_result();

    $assignments = [];

    while ($row = $result->fetch_assoc()) {

        $row['average_score'] =
            round((float)$row['average_score'], 2);

        $row['student_count'] =
            (int)$row['student_count'];

        $assignments[] = $row;

    }

    echo json_encode([

        "success" => true,

        "assignments" => $assignments

    ]);

    $stmt->close();

    $conn->close();

} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([

        "success" => false,

        "message" => "Failed to load teaching assignments.",

        "error" => $e->getMessage()

    ]);

}
