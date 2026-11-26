<?php

session_start();

header(
    'Content-Type: application/json'
);

require_once 'config.php';
require_once __DIR__ . '/powerup_service.php';
require_once __DIR__ . '/instructor_quiz_rewards.php';


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
            'Instructor session not found. Please log in again.'

    ]);

    exit;

}


/*
|--------------------------------------------------------------------------
| POST ONLY
|--------------------------------------------------------------------------
*/

if (

    $_SERVER['REQUEST_METHOD']

    !== 'POST'

) {

    http_response_code(405);

    echo json_encode([

        'success' => false,

        'message' =>
            'Method not allowed.'

    ]);

    exit;

}


/*
|--------------------------------------------------------------------------
| READ JSON INPUT
|--------------------------------------------------------------------------
*/

if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
    http_response_code(415); echo json_encode(['success'=>false,'message'=>'JSON request required.']); exit;
}

$input =

    json_decode(

        file_get_contents(
            'php://input'
        ),

        true

    );


$submissionId =

    (int)(

        $input['submission_id']

        ?? 0

    );


$questionIndex =

    (int)(

        $input['question_index']

        ?? -1

    );


$isCorrect =

    $input['is_correct']

    ?? null;


/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
*/

if ($submissionId <= 0) {

    http_response_code(400);

    echo json_encode([

        'success' => false,

        'message' =>
            'Invalid submission ID.'

    ]);

    exit;

}


if ($questionIndex < 0) {

    http_response_code(400);

    echo json_encode([

        'success' => false,

        'message' =>
            'Invalid question index.'

    ]);

    exit;

}


if (

    !is_bool(
        $isCorrect
    )

) {

    http_response_code(400);

    echo json_encode([

        'success' => false,

        'message' =>
            'Invalid grading value.'

    ]);

    exit;

}


try {

    $conn =
        getConnection();
    $conn->begin_transaction();
    $owner=pu_row($conn,'SELECT student_id FROM quiz_idsubmissions WHERE submission_id=?',[$submissionId]);
    if (!$owner) throw new RuntimeException('Submission not found.');
    pu_lock($conn,(int)$owner['student_id']);



    /*
    |--------------------------------------------------------------------------
    | GET SUBMISSION + QUIZ
    |
    | Also verifies that this quiz belongs
    | to the currently logged-in instructor.
    |--------------------------------------------------------------------------
    */

    $sql = "

        SELECT

            qs.submission_id,

            qs.quiz_id,

            qs.answers,

            qs.student_id,

            COALESCE((SELECT JSON_EXTRACT(snapshot_json,'$.questions') FROM quiz_submission_snapshots WHERE submission_id=qs.submission_id),q.questions) AS questions,

            COALESCE((SELECT JSON_EXTRACT(snapshot_json,'$.xp_reward') FROM quiz_submission_snapshots WHERE submission_id=qs.submission_id),q.xp_reward) AS xp_reward,

            q.instructor_id

        FROM quiz_idsubmissions qs

        INNER JOIN quizzes q

            ON q.quiz_id =
            qs.quiz_id

        WHERE

            qs.submission_id = ?

        AND

            q.instructor_id = ?

        LIMIT 1

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

        "ii",

        $submissionId,

        $instructorId

    );


    $stmt->execute();


    $result =

        $stmt
            ->get_result();


    if (

        $result->num_rows === 0

    ) {

        http_response_code(404);

        echo json_encode([

            'success' => false,

            'message' =>
                'Submission not found or you do not have permission to grade it.'

        ]);

        exit;

    }


    $row =
        $result->fetch_assoc();


    $stmt->close();


    /*
    |--------------------------------------------------------------------------
    | DECODE ANSWERS
    |--------------------------------------------------------------------------
    */

    $answers =

        json_decode(

            $row['answers'],

            true

        );


    $questions =

        json_decode(

            $row['questions'],

            true

        );


    if (

        !is_array(
            $answers
        )

    ) {

        $answers = [];

    }


    if (

        !is_array(
            $questions
        )

    ) {

        $questions = [];

    }


    /*
    |--------------------------------------------------------------------------
    | VERIFY QUESTION EXISTS
    |--------------------------------------------------------------------------
    */

    if (

        !isset(
            $questions[$questionIndex]
        )

    ) {

        http_response_code(400);

        echo json_encode([

            'success' => false,

            'message' =>
                'Question not found.'

        ]);

        exit;

    }


    /*
    |--------------------------------------------------------------------------
    | VERIFY IT IS AN IDENTIFICATION QUESTION
    |--------------------------------------------------------------------------
    */

    $questionType =

        $questions[
            $questionIndex
        ]['type']

        ?? '';


    /*
    | Identification questions are always graded manually.
    | A multiple-choice answer can also be graded manually, but ONLY when
    | it is still waiting for the instructor (this happens when the Admin
    | has switched Auto-Grading OFF). Answers that were already graded
    | automatically cannot be changed here.
    */

    $existingAnswerRow =
        $answers[$questionIndex]
        ?? [];

    $isPendingManualAnswer =

        is_array($existingAnswerRow)

        && (

            ($existingAnswerRow['pending'] ?? false) === true

            || (
                array_key_exists('correct', $existingAnswerRow)
                && $existingAnswerRow['correct'] === null
            )

        );


    if (

        $questionType !==
        'id'

        && !$isPendingManualAnswer

    ) {

        http_response_code(400);

        echo json_encode([

            'success' => false,

            'message' =>
                'Only identification questions or answers waiting for manual grading can be graded here.'

        ]);

        exit;

    }


    /*
    |--------------------------------------------------------------------------
    | UPDATE THE IDENTIFICATION ANSWER
    |--------------------------------------------------------------------------
    */

    if (

        !isset(
            $answers[$questionIndex]
        )

    ) {

        $answers[
            $questionIndex
        ] = [];

    }


    $answers[
        $questionIndex
    ]['correct'] =

        $isCorrect;


    $answers[
        $questionIndex
    ]['pending'] =

        false;


    /*
    |--------------------------------------------------------------------------
    | CHECK IF ALL IDENTIFICATION QUESTIONS
    | HAVE BEEN GRADED
    |--------------------------------------------------------------------------
    */

    $allIdentificationGraded =
        true;


    foreach (

        $questions as
        $index => $question

    ) {

        if (

            ($question['type'] ?? '') ===
            'id'

            || (
                isset($answers[$index])
                && is_array($answers[$index])
                && ($answers[$index]['pending'] ?? false) === true
            )

        ) {

            if (

                !isset(
                    $answers[$index]
                )

                ||

                !array_key_exists(

                    'correct',

                    $answers[$index]

                )

                ||

                $answers[$index]['correct']
                === null

            ) {

                $allIdentificationGraded =
                    false;

                break;

            }

        }

    }


    /*
    |--------------------------------------------------------------------------
    | RECALCULATE SCORE
    |--------------------------------------------------------------------------
    */

    $totalQuestions =

        count(
            $questions
        );


    $correctCount =
        0;


    foreach (

        $questions as
        $index => $question

    ) {

        $answer =

            $answers[$index]

            ?? [];


        $type =

            $question['type']

            ?? '';


        /*
        | Multiple Choice
        */

        if (

            $type ===
            'mc'

        ) {

            if (

                isset(
                    $answer['correct']
                )

                &&

                $answer['correct']
                === true

            ) {

                $correctCount++;

            }

        }


        /*
        | Identification
        */

        if (

            $type ===
            'id'

        ) {

            if (

                isset(
                    $answer['correct']
                )

                &&

                $answer['correct']
                === true

            ) {

                $correctCount++;

            }

        }

    }


    $score =

        $totalQuestions > 0

            ? round(

                (

                    $correctCount /

                    $totalQuestions

                ) * 100

            )

            : 0;


    /*
    |--------------------------------------------------------------------------
    | KEEP ANY GRADE BOOST
    | Previously redeemed +1 Grade Boosts on this result stay applied when
    | the score is recalculated.
    |--------------------------------------------------------------------------
    */

    try {

        $boostStmt = $conn->prepare(
            'SELECT COUNT(*) AS boosts
             FROM grade_boost_redemptions
             WHERE submission_id = ?'
        );

        if ($boostStmt) {

            $boostStmt->bind_param(
                'i',
                $submissionId
            );

            $boostStmt->execute();

            $boostRow =
                $boostStmt
                    ->get_result()
                    ->fetch_assoc();

            $boostStmt->close();

            if ((int)($boostRow['boosts'] ?? 0) > 0) {

                $score = min(
                    100,
                    $score + (int)$boostRow['boosts']
                );

            }

        }

    } catch (Throwable $boostError) {

        // Table not created yet (migration not run): nothing to keep.

    }


    /*
    |--------------------------------------------------------------------------
    | DETERMINE STATUS
    |--------------------------------------------------------------------------
    */

    $status =

        $allIdentificationGraded

            ? 'graded'

            : 'pending_review';


    /*
    |--------------------------------------------------------------------------
    | CALCULATE XP
    |
    | XP is awarded only after grading is complete.
    |
    | Passing score = 80%
    |--------------------------------------------------------------------------
    */

    $xpEarned = 0;

if ($allIdentificationGraded) {
    $xpReward = max(0, (int)$row['xp_reward']);
    $scorePercentage = max(0, min(100, (float)$score));

    $xpEarned = (int) round(
        $xpReward * ($scorePercentage / 100)
    );
}


    /*
    |--------------------------------------------------------------------------
    | SAVE UPDATED SUBMISSION
    |--------------------------------------------------------------------------
    */

    if ($allIdentificationGraded) {
        $xpEarned=pu_award($conn,(int)$row['student_id'],(int)$submissionId,$xpEarned);
    }

    $answersJson =

        json_encode(

            $answers,

            JSON_UNESCAPED_UNICODE
            |
            JSON_UNESCAPED_SLASHES

        );


    $updateSql = "

        UPDATE quiz_idsubmissions

        SET

            answers = ?,

            score = ?,

            xp_earned = ?,

            status = ?

        WHERE

            submission_id = ?   

    ";


    $updateStmt =

        $conn->prepare(
            $updateSql
        );


    if (!$updateStmt) {

        throw new Exception(
            $conn->error
        );

    }


    $updateStmt->bind_param(

        "sdisi",

        $answersJson,

        $score,

        $xpEarned,

        $status,

        $submissionId

    );


    if (

        !$updateStmt->execute()

    ) {

        throw new Exception(
            $updateStmt->error
        );

    }

    pu_sync($conn,(int)$row['student_id']);

    // If the due date has passed and all submissions are finalized,
    // this may award the instructor's 85% pass-rate bonus.
    awardQuizPassRateTeachingExp(
        $conn,
        (int)$row['quiz_id'],
        (int)$row['instructor_id']
    );


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    $conn->commit();

    echo json_encode([

        'success' => true,

        'message' =>
            'Identification answer graded successfully.',

        'submission' => [

            'submission_id' =>

                $submissionId,

            'score' =>

                $score,

            'xp_earned' =>

                $xpEarned,

            'status' =>

                $status,

            'answers' =>

                $answers

        ]

    ]);


    $updateStmt->close();

    $conn->close();


} catch (Throwable $e) {
    if (isset($conn)) $conn->rollback();

    http_response_code(500);

    echo json_encode([

        'success' => false,

        'message' =>
            'Failed to save the grade.',

        'error' =>
            $e->getMessage()

    ]);

}