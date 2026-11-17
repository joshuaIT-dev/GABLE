<?php

session_start();

header('Content-Type: application/json');

require_once 'config.php';
function quiz_require_assignment(mysqli $db,int $instructor,string $subject,string $section): void {
    $stmt=$db->prepare('SELECT assignment_id FROM teaching_assignments WHERE instructor_id=? AND LOWER(TRIM(subject_name))=LOWER(TRIM(?)) AND LOWER(TRIM(section))=LOWER(TRIM(?)) LIMIT 1');
    $stmt->bind_param('iss',$instructor,$subject,$section);$stmt->execute();
    $assigned=(bool)$stmt->get_result()->fetch_assoc();$stmt->close();
    if (!$assigned) auth_fail(403,'You are not assigned to this subject and section.');
}

require_once __DIR__ . '/instructor_quiz_rewards.php';
require_once __DIR__ . '/platform_guard.php';


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
| GET QUIZZES
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    try {

        $conn = getConnection();

        $sql = "
            SELECT
                quiz_id AS id,
                instructor_id,
                title,
                subject,
                section,
                mode,
                quiz_type,
                due_date,
                time_limit,
                xp_reward,
                instructions,
                questions,
                status,
                created_at
            FROM quizzes
            WHERE instructor_id = ?
            ORDER BY created_at DESC
        ";

        $stmt = $conn->prepare($sql);

        if (!$stmt) {
            throw new Exception($conn->error);
        }

        $stmt->bind_param(
            "i",
            $instructorId
        );

        if (!$stmt->execute()) {
            throw new Exception($stmt->error);
        }

        $result = $stmt->get_result();

        $quizzes = [];
        $submissionGroups=[];
        $allSubmissions=$conn->prepare('SELECT qs.*,s.first_name,s.last_name,s.student_number,s.block FROM quiz_idsubmissions qs JOIN quizzes q ON q.quiz_id=qs.quiz_id LEFT JOIN student s ON s.student_id=qs.student_id WHERE q.instructor_id=? ORDER BY qs.submitted_at DESC');
        $allSubmissions->bind_param('i',$instructorId);$allSubmissions->execute();
        foreach($allSubmissions->get_result()->fetch_all(MYSQLI_ASSOC) as $submission) $submissionGroups[(int)$submission['quiz_id']][]=$submission;
        $allSubmissions->close();


        while ($row = $result->fetch_assoc()) {

    /*
    |--------------------------------------------------------------------------
    | DECODE QUIZ QUESTIONS
    |--------------------------------------------------------------------------
    */

    $questions =
        json_decode(
            $row['questions'],
            true
        );


    if (
        !is_array(
            $questions
        )
    ) {

        $questions = [];

    }


    /*
    |--------------------------------------------------------------------------
    | LOAD STUDENT SUBMISSIONS
    |--------------------------------------------------------------------------
    */

    $quizId =
        (int)$row['id'];


    $submissions = [];


    /*
    |--------------------------------------------------------------------------
    | COLORS FOR STUDENT AVATARS
    |--------------------------------------------------------------------------
    */

    $avatarColors = [

        '#7c5ce0',

        '#2493d1',

        '#20a45b',

        '#d48a28',

        '#d05c9b'

    ];


    $submissionIndex =
        0;


    foreach ($submissionGroups[$quizId]??[] as $submissionRow) {


        /*
        |--------------------------------------------------------------------------
        | DECODE STUDENT ANSWERS
        |--------------------------------------------------------------------------
        */

        $answers =
            json_decode(

                $submissionRow[
                    'answers'
                ],

                true

            );


        if (
            !is_array(
                $answers
            )
        ) {

            $answers = [];

        }


        /*
        |--------------------------------------------------------------------------
        | STUDENT NAME
        |--------------------------------------------------------------------------
        */

        $firstName =

            $submissionRow[
                'first_name'
            ]

            ?? 'Student';


        $lastName =

            $submissionRow[
                'last_name'
            ]

            ?? '';


        $studentName =

            trim(

                $firstName
                . ' '
                . $lastName

            );


        /*
        |--------------------------------------------------------------------------
        | STUDENT INITIALS
        |--------------------------------------------------------------------------
        */

        $initials =

            strtoupper(

                substr(
                    $firstName,
                    0,
                    1
                )

                .

                substr(
                    $lastName,
                    0,
                    1
                )

            );


        if (
            !$initials
        ) {

            $initials =
                'ST';

        }


        /*
        |--------------------------------------------------------------------------
        | ADD SUBMISSION
        |--------------------------------------------------------------------------
        */

        $submissions[] = [

            'submissionId' =>

                (int)$submissionRow[
                    'submission_id'
                ],


            'quizId' =>

                (int)$submissionRow[
                    'quiz_id'
                ],


            'studentId' =>

                (int)$submissionRow[
                    'student_id'
                ],


            'studentNumber' =>

                $submissionRow[
                    'student_number'
                ] ?? '',


            'name' =>

                $studentName,


            'initials' =>

                $initials,


            'section' =>

                $submissionRow[
                    'block'
                ] ?? '',


            'answers' =>

                $answers,


            'score' =>

                (float)$submissionRow[
                    'score'
                ],


            'xp' =>

                (int)$submissionRow[
                    'xp_earned'
                ],


            'status' =>

                $submissionRow[
                    'status'
                ],


            'submittedAt' =>

                $submissionRow[
                    'submitted_at'
                ],


            /*
            |--------------------------------------------------------------------------
            | CURRENT UI EXPECTS THESE
            |--------------------------------------------------------------------------
            */

            'mins' =>

                0,


            'color' =>

                $avatarColors[
                    $submissionIndex
                    %
                    count(
                        $avatarColors
                    )
                ]

        ];


        $submissionIndex++;

    }




    /*
    |--------------------------------------------------------------------------
    | CALCULATE QUIZ STATISTICS
    |--------------------------------------------------------------------------
    */

    $completed =

        count(
            $submissions
        );


    $totalScore =

        array_sum(

            array_column(

                $submissions,

                'score'

            )

        );


    $averageScore =

        $completed > 0

            ? round(

                $totalScore /
                $completed

            )

            : 0;


    $totalXP =

        array_sum(

            array_column(

                $submissions,

                'xp'

            )

        );


    /*
    |--------------------------------------------------------------------------
    | ADD QUIZ TO RESPONSE
    |--------------------------------------------------------------------------
    */

    $quizzes[] = [

        'id' =>

            $quizId,


        'instructor_id' =>

            (int)$row[
                'instructor_id'
            ],


        'title' =>

            $row[
                'title'
            ],


        'subject' =>

            $row[
                'subject'
            ],


        'section' =>

            $row[
                'section'
            ],


        'mode' =>

            $row[
                'mode'
            ],


        'type' =>

            $row[
                'quiz_type'
            ],


        'due' =>

            $row[
                'due_date'
            ],


        'time' =>

            (int)$row[
                'time_limit'
            ],


        'xpReward' =>

            (int)$row[
                'xp_reward'
            ],


        'instructions' =>

            $row[
                'instructions'
            ],


        'questions' =>

            $questions,


        'status' =>

            $row[
                'status'
            ],


        'stats' => [

            'completed' =>

                $completed,


            'inProgress' =>

                0,


            'avgScore' =>

                $averageScore,


            'alignment' =>

                0,


            'xp' =>

                $totalXP

        ],


        /*
        |--------------------------------------------------------------------------
        | REAL DATABASE SUBMISSIONS
        |--------------------------------------------------------------------------
        */

        'submissions' =>

            $submissions

    ];

}

        echo json_encode([

            'success' => true,

            'quizzes' => $quizzes

        ]);

        $stmt->close();
        $conn->close();

        exit;

    } catch (Exception $e) {

        http_response_code(500);

        echo json_encode([

            'success' => false,

            'message' =>
                'Failed to load quizzes.',

            'error' =>
                $e->getMessage()

        ]);

        exit;
    }
}


/*
|--------------------------------------------------------------------------
| ONLY POST IS ALLOWED BELOW THIS POINT
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

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
| DRAFT ACTIONS
|--------------------------------------------------------------------------
*/

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$action = $input['action'] ?? '';


/*
|--------------------------------------------------------------------------
| PUBLISH DRAFT
|--------------------------------------------------------------------------
*/

if ($action === 'publish') {

    $quizId = (int)(
        $input['quiz_id'] ?? 0
    );

    if ($quizId <= 0) {

        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid quiz ID.'
        ]);

        exit;
    }


    // Platform Settings: Battle Royale Mode must be ON to activate one.
    platform_assert_battle_royale_publish($quizId, (int)$instructorId);

    try {

        $conn = getConnection();

        $assignment=$conn->prepare('SELECT subject,section FROM quizzes WHERE quiz_id=? AND instructor_id=?');
        $assignment->bind_param('ii',$quizId,$instructorId);$assignment->execute();
        $owned=$assignment->get_result()->fetch_assoc();$assignment->close();
        if (!$owned) auth_fail(404,'Draft quiz not found.');
        quiz_require_assignment($conn,(int)$instructorId,$owned['subject'],$owned['section']);

        $sql = "
            UPDATE quizzes

            SET status = 'active'

            WHERE quiz_id = ?
            AND instructor_id = ?
            AND status = 'draft'
        ";

        $stmt = $conn->prepare($sql);

        if (!$stmt) {
            throw new Exception(
                $conn->error
            );
        }

        $stmt->bind_param(
            "ii",
            $quizId,
            $instructorId
        );

        if (!$stmt->execute()) {
            throw new Exception(
                $stmt->error
            );
        }


        if ($stmt->affected_rows === 0) {

            http_response_code(404);

            echo json_encode([
                'success' => false,
                'message' =>
                    'Draft quiz not found.'
            ]);

            $stmt->close();
            $conn->close();

            exit;
        }


        echo json_encode([
            'success' => true,
            'message' =>
                'Quiz published successfully.'
        ]);

        $stmt->close();
        $conn->close();

        exit;


    } catch (Throwable $e) {

        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' =>
                'Failed to publish quiz.',
            'error' =>
                $e->getMessage()
        ]);

        exit;
    }
}


/*
|--------------------------------------------------------------------------
| DELETE QUIZ
|--------------------------------------------------------------------------
*/

if ($action === 'delete') {

    $quizId = (int)(
        $input['quiz_id'] ?? 0
    );

    if ($quizId <= 0) {

        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid quiz ID.'
        ]);

        exit;
    }

    try {

        $conn = getConnection();

        /*
        |--------------------------------------------------------------------------
        | DELETE QUIZ
        |--------------------------------------------------------------------------
        |
        | The instructor can only delete their own quiz.
        | This works for BOTH draft and active quizzes.
        |
        */

        $sql = "
            DELETE FROM quizzes
            WHERE quiz_id = ?
            AND instructor_id = ?
        ";

        $stmt = $conn->prepare($sql);

        if (!$stmt) {

            throw new Exception(
                $conn->error
            );

        }

        $stmt->bind_param(
            "ii",
            $quizId,
            $instructorId
        );

        if (!$stmt->execute()) {

            throw new Exception(
                $stmt->error
            );

        }

        /*
        |--------------------------------------------------------------------------
        | CHECK IF QUIZ EXISTED
        |--------------------------------------------------------------------------
        */

        if ($stmt->affected_rows === 0) {

            http_response_code(404);

            echo json_encode([
                'success' => false,
                'message' =>
                    'Quiz not found or you do not have permission to delete it.'
            ]);

            $stmt->close();
            $conn->close();

            exit;
        }

        /*
        |--------------------------------------------------------------------------
        | SUCCESS
        |--------------------------------------------------------------------------
        */

        echo json_encode([
            'success' => true,
            'message' =>
                'Quiz deleted successfully.'
        ]);

        $stmt->close();
        $conn->close();

        exit;

    } catch (Throwable $e) {

        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' =>
                'Failed to delete quiz.',
            'error' =>
                $e->getMessage()
        ]);

        exit;
    }
}


/*
|--------------------------------------------------------------------------
| UPDATE QUIZ
|--------------------------------------------------------------------------
*/

if ($action === 'update') {

    $quizId = (int)(
        $input['quiz_id'] ?? 0
    );

    if ($quizId <= 0) {

        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid quiz ID.'
        ]);

        exit;
    }

    $status = strtolower(trim($input['status'] ?? 'active'));
if ($status !== 'draft' && $status !== 'active') {
    $status = 'active';
}


    /*
    |--------------------------------------------------------------------------
    | GET UPDATED QUIZ DATA
    |--------------------------------------------------------------------------
    */

    $title = trim(
        $input['title'] ?? ''
    );

    $subject = trim(
        $input['subject'] ?? ''
    );

    $section = trim(
        $input['section'] ?? ''
    );

    $mode = strtolower(
        trim(
            $input['mode'] ?? 'formal'
        )
    );

    $quizType = trim(
        $input['quiz_type']
        ?? $input['type']
        ?? ''
    );

    $dueDate =
        $input['due_date']
        ?? $input['due']
        ?? null;

    $timeLimit = (int)(
        $input['time_limit']
        ?? $input['time']
        ?? 30
    );

    $xpReward = (int)(
        $input['xp_reward']
        ?? $input['xpReward']
        ?? 0
    );

    $instructions = trim(
        $input['instructions'] ?? ''
    );

    $questions =
        $input['questions'] ?? [];


    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if ($title === '') {

        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' =>
                'Quiz title is required.'
        ]);

        exit;
    }

    if ($subject === '') {

        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' =>
                'Subject is required.'
        ]);

        exit;
    }

    if ($section === '') {

        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' =>
                'Section is required.'
        ]);

        exit;
    }

    if (
        $mode !== 'formal' &&
        $mode !== 'informal'
    ) {

        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' =>
                'Invalid quiz mode.'
        ]);

        exit;
    }

    if (!is_array($questions)) {

        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' =>
                'Questions must be an array.'
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | ENCODE QUESTIONS
    |--------------------------------------------------------------------------
    */

    $questionsJson = json_encode(
        $questions,
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
    );

    if ($questionsJson === false) {

        throw new Exception(
            'Failed to encode quiz questions.'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | UPDATE DATABASE
    |--------------------------------------------------------------------------
    */

    // Platform Settings: Battle Royale Mode must be ON to switch to / activate one.
    platform_assert_battle_royale_update($quizId, (int)$instructorId, $quizType, $status);

    try {

        $conn = getConnection();

        quiz_require_assignment($conn,(int)$instructorId,$subject,$section);

        $sql = "
    UPDATE quizzes
    SET
        title = ?,
        subject = ?,
        section = ?,
        mode = ?,
        quiz_type = ?,
        due_date = NULLIF(?, ''),
        time_limit = ?,
        xp_reward = ?,
        instructions = ?,
        questions = ?,
        status = ?
    WHERE quiz_id = ?
    AND instructor_id = ?
";

$stmt = $conn->prepare($sql);
if (!$stmt) { throw new Exception($conn->error); }

$stmt->bind_param(
    "ssssssiisssii",
    $title,
    $subject,
    $section,
    $mode,
    $quizType,
    $dueDate,
    $timeLimit,
    $xpReward,
    $instructions,
    $questionsJson,
    $status,
    $quizId,
    $instructorId
);


        if (!$stmt->execute()) {

            throw new Exception(
                $stmt->error
            );
        }


        /*
        |--------------------------------------------------------------------------
        | CHECK IF QUIZ EXISTS
        |--------------------------------------------------------------------------
        */

        if ($stmt->affected_rows === 0) {

            /*
             * affected_rows can be 0 if the submitted
             * values are identical to the existing values.
             *
             * So check whether the quiz actually exists.
             */

            $checkSql = "

                SELECT quiz_id

                FROM quizzes

                WHERE quiz_id = ?
                AND instructor_id = ?

                LIMIT 1

            ";

            $checkStmt =
                $conn->prepare(
                    $checkSql
                );

            $checkStmt->bind_param(
                "ii",
                $quizId,
                $instructorId
            );

            $checkStmt->execute();

            $checkResult =
                $checkStmt->get_result();

            if (
                !$checkResult->fetch_assoc()
            ) {

                http_response_code(404);

                echo json_encode([
                    'success' => false,
                    'message' =>
                        'Quiz not found or you do not have permission to edit it.'
                ]);

                $checkStmt->close();
                $stmt->close();
                $conn->close();

                exit;
            }

            $checkStmt->close();
        }


        /*
        |--------------------------------------------------------------------------
        | SUCCESS
        |--------------------------------------------------------------------------
        */

        echo json_encode([

            'success' => true,

            'message' =>
                'Quiz updated successfully.',

            'quiz' => [

                'id' =>
                    $quizId,

                'instructor_id' =>
                    (int)$instructorId,

                'title' =>
                    $title,

                'subject' =>
                    $subject,

                'section' =>
                    $section,

                'mode' =>
                    $mode,

                'type' =>
                    $quizType,

                'due' =>
                    $dueDate,

                'time' =>
                    $timeLimit,

                'xpReward' =>
                    $xpReward,

                'instructions' =>
                    $instructions,

                'questions' =>
                    $questions

            ]

        ]);


        $stmt->close();
        $conn->close();

        exit;


    } catch (Throwable $e) {

        http_response_code(500);

        echo json_encode([

            'success' => false,

            'message' =>
                'Failed to update quiz.',

            'error' =>
                $e->getMessage()

        ]);

        exit;
    }
}


/*
|--------------------------------------------------------------------------
| CREATE QUIZ
|--------------------------------------------------------------------------
*/

try {

    $input = json_decode(
        file_get_contents('php://input'),
        true
    );

    if (!is_array($input)) {
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid JSON request body.'
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | GET INPUT
    |--------------------------------------------------------------------------
    */

    $title = trim($input['title'] ?? '');
    $subject = trim($input['subject'] ?? '');
    $section = trim($input['section'] ?? '');

    $mode = trim($input['mode'] ?? '');
    $quizType = trim(
        $input['quiz_type']
        ?? $input['type']
        ?? ''
    );

    $dueDate = $input['due_date']
        ?? $input['due']
        ?? null;

    $timeLimit = (int)(
        $input['time_limit']
        ?? $input['time']
        ?? 0
    );

    $xpReward = (int)(
        $input['xp_reward']
        ?? $input['xpReward']
        ?? 0
    );

    $instructions = trim(
        $input['instructions'] ?? ''
    );

    $questions = $input['questions'] ?? [];


    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if ($title === '') {
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Quiz title is required.'
        ]);

        exit;
    }

    if (!is_array($questions)) {
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Questions must be an array.'
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | ENCODE QUESTIONS
    |--------------------------------------------------------------------------
    */

    $questionsJson = json_encode(
        $questions,
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
    );

    if ($questionsJson === false) {
        throw new Exception(
            'Failed to encode quiz questions.'
        );
    }

    // Platform Settings: Battle Royale Mode must be ON to create one.
    platform_assert_battle_royale_create($quizType);

    $conn = getConnection();

    /*
|--------------------------------------------------------------------------
| VERIFY INSTRUCTOR SECTION
|--------------------------------------------------------------------------
| The instructor can only create a quiz
| for a section assigned to them.
*/

quiz_require_assignment($conn,(int)$instructorId,$subject,$section);

    $sql = "
        INSERT INTO quizzes (
            instructor_id,
            title,
            subject,
            section,
            mode,
            quiz_type,
            due_date,
            time_limit,
            xp_reward,
            instructions,
            questions,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception($conn->error);
    }


   $status = strtolower(
    trim($input['status'] ?? 'draft')
);

if ($status !== 'draft' && $status !== 'active') {
    $status = 'draft';
}


    $stmt->bind_param(
    "issssssiiiss",
        $instructorId,
        $title,
        $subject,
        $section,
        $mode,
        $quizType,
        $dueDate,
        $timeLimit,
        $xpReward,
        $instructions,
        $questionsJson,
        $status
    );


    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }


    /*
    |--------------------------------------------------------------------------
    | SUCCESS RESPONSE
    |--------------------------------------------------------------------------
    */

    $quizId = $stmt->insert_id;

echo json_encode([
    'success' => true,

    'message' =>
        $status === 'active'
            ? 'Quiz posted successfully.'
            : 'Quiz saved as draft.',

    'quiz_id' => $quizId,

    'quiz' => [

        'id' => (int)$quizId,

        'instructor_id' =>
            (int)$instructorId,

        'title' =>
            $title,

        'subject' =>
            $subject,

        'section' =>
            $section,

        'mode' =>
            $mode,

        'type' =>
            $quizType,

        'due' =>
            $dueDate,

        'time' =>
            $timeLimit,

        'xpReward' =>
            $xpReward,

        'instructions' =>
            $instructions,

        'questions' =>
            $questions,

        'status' =>
            $status,

        'stats' => [

            'completed' => 0,

            'inProgress' => 0,

            'avgScore' => 0,

            'alignment' => 0,

            'xp' => 0

        ],

        'submissions' => []

    ]
]);

    $stmt->close();
    $conn->close();

    exit;


} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Failed to create quiz.',
        'error' => $e->getMessage()
    ]);

    exit;
}
