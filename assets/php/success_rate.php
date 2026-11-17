
<?php

    /*
    |--------------------------------------------------------------------------
    | FOR THE CALCULATION OF STUDENT SUCCESS RATE FOR IDASHBOARD
    |--------------------------------------------------------------------------
    */


session_start();

header("Content-Type: application/json");

require_once "config.php";

/*
|--------------------------------------------------------------------------
| VERIFY INSTRUCTOR SESSION
|--------------------------------------------------------------------------
*/

$instructorId =
    $_SESSION["instructor"]
    ?? $_SESSION["instructor_id"]
    ?? null;

if (!$instructorId || !is_numeric($instructorId)) {
    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "Instructor session not found."
    ]);

    exit;
}

$instructorId = (int)$instructorId;

try {

    $conn = getConnection();

    /*
    |--------------------------------------------------------------------------
    | GET ALL SUBMISSIONS FOR THIS INSTRUCTOR'S QUIZZES
    |--------------------------------------------------------------------------
    */

    $sql = "
        SELECT
            qs.student_id,
            qs.score,
            qs.status,
            qs.answers,
            q.questions

        FROM quiz_idsubmissions qs

        INNER JOIN quizzes q
            ON q.quiz_id = qs.quiz_id

        WHERE q.instructor_id = ?

        AND qs.status IN ('graded', 'submitted')
    ";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception("Failed to prepare submissions query.");
    }

    $stmt->bind_param("i", $instructorId);

    $stmt->execute();

    $result = $stmt->get_result();

    /*
    |--------------------------------------------------------------------------
    | COLLECT FINALIZED SCORES PER STUDENT
    |--------------------------------------------------------------------------
    */

    $studentScores = [];

    while ($row = $result->fetch_assoc()) {

        $status = strtolower(trim($row["status"] ?? ""));

        $score = $row["score"];

        if (
            $row["student_id"] === null ||
            $score === null ||
            !is_numeric($score)
        ) {
            continue;
        }

        $score = (float)$score;

        if ($score < 0 || $score > 100) {
            continue;
        }

        /*
        |--------------------------------------------------------------------------
        | GRADED SUBMISSIONS ARE FINAL
        |--------------------------------------------------------------------------
        */

        if ($status === "graded") {

            $isFinalized = true;

        } else {

            /*
            |--------------------------------------------------------------------------
            | SUBMITTED SUBMISSIONS ARE COUNTED ONLY IF:
            | 1. The quiz has no Identification questions.
            | 2. No answer is still pending manual review.
            |--------------------------------------------------------------------------
            */

            $questions = json_decode(
                $row["questions"] ?? "[]",
                true
            );

            $answers = json_decode(
                $row["answers"] ?? "[]",
                true
            );

            if (!is_array($questions) || !is_array($answers)) {
                continue;
            }

            $hasIdentification = false;

            foreach ($questions as $question) {

                if (
                    strtolower(trim($question["type"] ?? "")) === "id"
                ) {
                    $hasIdentification = true;
                    break;
                }
            }

            $hasPendingAnswer = false;

            foreach ($answers as $answer) {

                if (
                    !is_array($answer) ||
                    !array_key_exists("pending", $answer) ||
                    $answer["pending"] === true
                ) {
                    $hasPendingAnswer = true;
                    break;
                }
            }

            $isFinalized =
                !$hasIdentification &&
                !$hasPendingAnswer;
        }

        if (!$isFinalized) {
            continue;
        }

        $studentId = (string)$row["student_id"];

        if (!isset($studentScores[$studentId])) {
            $studentScores[$studentId] = [];
        }

        $studentScores[$studentId][] = $score;
    }

    $stmt->close();

    /*
    |--------------------------------------------------------------------------
    | CALCULATE EACH STUDENT'S AVERAGE
    |--------------------------------------------------------------------------
    */

    $totalStudents = 0;
    $successfulStudents = 0;

    foreach ($studentScores as $scores) {

        if (count($scores) === 0) {
            continue;
        }

        $averageScore =
            array_sum($scores) / count($scores);

        $totalStudents++;

        if ($averageScore >= 80) {
            $successfulStudents++;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | CALCULATE STUDENT SUCCESS RATE
    |--------------------------------------------------------------------------
    */

    $successRate = $totalStudents > 0
        ? round(
            ($successfulStudents / $totalStudents) * 100,
            1
        )
        : 0;

    echo json_encode([
        "success" => true,
        "student_success_rate" => $successRate,
        "successful_students" => $successfulStudents,
        "total_students" => $totalStudents
    ]);

    $conn->close();

} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Failed to calculate Student Success Rate.",
        "error" => $e->getMessage()
    ]);
}
