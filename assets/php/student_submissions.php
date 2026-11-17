<?php

session_start();

header('Content-Type: application/json');

require_once 'config.php';


/*
|--------------------------------------------------------------------------
| CHECK STUDENT SESSION
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


    /*
    |--------------------------------------------------------------------------
    | GET ALL SUBMISSIONS FOR LOGGED-IN STUDENT
    |--------------------------------------------------------------------------
    */

    $sql = "
    SELECT
        submission_id,
        quiz_id,
        student_id,
        answers,
        score,
        xp_earned,
        status,
        submitted_at
    FROM quiz_IDsubmissions
    WHERE student_id = ?
      AND LOWER(TRIM(status)) IN (
          'submitted',
          'pending_review',
          'graded'
      )
    ORDER BY submitted_at DESC
";


    $stmt =
        $conn->prepare($sql);


    if (!$stmt) {

        throw new Exception(
            $conn->error
        );

    }


    $stmt->bind_param(
        "i",
        $studentId
    );


    $stmt->execute();


    $result =
        $stmt->get_result();


    $submissions = [];


    while (
        $row =
        $result->fetch_assoc()
    ) {

        /*
        |--------------------------------------------------------------------------
        | DECODE ANSWERS
        |--------------------------------------------------------------------------
        */

        $answers = json_decode($row['answers'], true);

        if (!is_array($answers)) {
            $answers = [];
        }

        $status = strtolower(
            trim((string)($row['status'] ?? 'submitted'))
        );

        $submissions[] = [
            'submissionId' => (int)$row['submission_id'],
            'quizId' => (int)$row['quiz_id'],
            'studentId' => (int)$row['student_id'],
            'answers' => $answers,
            'score' => $status === 'pending_review'
                ? null
                : (float)($row['score'] ?? 0),
            'xpEarned' => (int)($row['xp_earned'] ?? 0),
            'status' => $status,
            'submittedAt' => $row['submitted_at']
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

        'success' =>
            true,

        'submissions' =>
            $submissions,

        'submission_count' =>
            count($submissions)

    ]);


} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([

        'success' =>
            false,

        'message' =>
            'Failed to load student submissions.',

        'error' =>
            $e->getMessage()

    ]);

}
