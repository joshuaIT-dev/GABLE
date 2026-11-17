<?php

session_start();

header('Content-Type: application/json');

require_once 'config.php';


/*
|--------------------------------------------------------------------------
| INSTRUCTOR LOGIN
|--------------------------------------------------------------------------
*/

$instructor_id =
    $_SESSION['instructor']
    ?? $_SESSION['instructor_id']
    ?? null;


if (!$instructor_id) {

    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Instructor session not found.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| USE ONE CONSISTENT VARIABLE
|--------------------------------------------------------------------------
*/

$instructorId = (int)$instructor_id;


/*
|--------------------------------------------------------------------------
| ONLY POST
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

    http_response_code(405);

    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| READ JSON
|--------------------------------------------------------------------------
*/

$input = json_decode(
    file_get_contents('php://input'),
    true
);


if (!is_array($input)) {

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => 'Invalid JSON request.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| BASIC DATA
|--------------------------------------------------------------------------
*/

$questionID =
    isset($input['question_id'])
        ? (int)$input['question_id']
        : 0;


$section =
    trim($input['section'] ?? '');


$topic =
    trim($input['topic'] ?? '');


$gameMode =
    trim($input['game_mode'] ?? '');


/*
|--------------------------------------------------------------------------
| QUESTION TEXT
|--------------------------------------------------------------------------
|
| Kahoot / Buzzer use question_text.
|
*/

$questionText =
    trim(
        $input['question_text']
        ?? ''
    );


/*
|--------------------------------------------------------------------------
| ANSWER
|--------------------------------------------------------------------------
|
| Crossword / Hot Seat / Jumble / other
| game modes can use answer.
|
*/

$answer =
    trim(
        $input['answer']
        ?? $input['correct_answer']
        ?? $input['correct_word']
        ?? $input['word']
        ?? ''
    );


/*
|--------------------------------------------------------------------------
| MULTIPLE CHOICE OPTIONS
|--------------------------------------------------------------------------
*/

$optionA =
    trim(
        $input['option_a']
        ?? ''
    );


$optionB =
    trim(
        $input['option_b']
        ?? ''
    );


$optionC =
    trim(
        $input['option_c']
        ?? ''
    );


$optionD =
    trim(
        $input['option_d']
        ?? ''
    );


/*
|--------------------------------------------------------------------------
| HINT / CLUE
|--------------------------------------------------------------------------
*/

$hint =
    trim(
        $input['hint']
        ?? $input['clue']
        ?? ''
    );


/*
|--------------------------------------------------------------------------
| JUMBLED WORD
|--------------------------------------------------------------------------
*/

$jumbledWord =
    trim(
        $input['jumbled_word']
        ?? $input['jumble']
        ?? ''
    );


/*
|--------------------------------------------------------------------------
| CROSSWORD DATA
|--------------------------------------------------------------------------
*/

$crosswordRow =
    isset($input['crossword_row'])
        && $input['crossword_row'] !== ''
        ? (int)$input['crossword_row']
        : null;


$crosswordCol =
    isset($input['crossword_col'])
        && $input['crossword_col'] !== ''
        ? (int)$input['crossword_col']
        : null;


$crosswordDirection =
    trim(
        $input['crossword_direction']
        ?? ''
    );


$crosswordNumber =
    isset($input['crossword_number'])
        && $input['crossword_number'] !== ''
        ? (int)$input['crossword_number']
        : null;


/*
|--------------------------------------------------------------------------
| POINTS
|--------------------------------------------------------------------------
*/

$points =
    isset($input['points'])
        ? max(1, (int)$input['points'])
        : 1;


/*
|--------------------------------------------------------------------------
| VALIDATE GAME MODE
|--------------------------------------------------------------------------
*/

$allowedModes = [
    'buzzer',
    'kahoot',
    'hotseat',
    'jumble',
    'crossword'
];


if (
    !$section ||
    !$topic ||
    !$gameMode ||
    !in_array(
        $gameMode,
        $allowedModes,
        true
    )
) {

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' =>
            'Missing or invalid section, topic, or game mode.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| DATABASE CONNECTION
|--------------------------------------------------------------------------
*/

$conn = getConnection();


/*
|--------------------------------------------------------------------------
| VERIFY INSTRUCTOR OWNS SECTION + TOPIC
|--------------------------------------------------------------------------
*/

$assignmentStmt =
    $conn->prepare("
        SELECT assignment_id
        FROM teaching_assignments
        WHERE instructor_id = ?
          AND section = ?
          AND subject_name = ?
        LIMIT 1
    ");


if (!$assignmentStmt) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' =>
            'Failed to prepare assignment verification.',
        'error' =>
            $conn->error
    ]);

    $conn->close();

    exit;
}


$assignmentStmt->bind_param(
    'iss',
    $instructorId,
    $section,
    $topic
);


if (!$assignmentStmt->execute()) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' =>
            'Failed to verify teaching assignment.',
        'error' =>
            $assignmentStmt->error
    ]);

    $assignmentStmt->close();
    $conn->close();

    exit;
}


$assignmentResult =
    $assignmentStmt->get_result();


if (!$assignmentResult->fetch_assoc()) {

    $assignmentStmt->close();
    $conn->close();

    http_response_code(403);

    echo json_encode([
        'success' => false,
        'message' =>
            'This section and topic are not assigned to you.'
    ]);

    exit;
}


$assignmentStmt->close();


/*
|--------------------------------------------------------------------------
| INSERT NEW QUESTION
|--------------------------------------------------------------------------
*/

if ($questionID <= 0) {

    $stmt =
        $conn->prepare("
            INSERT INTO game_questions (
                instructor_id,
                section,
                topic,
                game_mode,
                question_text,
                answer,
                option_a,
                option_b,
                option_c,
                option_d,
                hint,
                jumbled_word,
                crossword_row,
                crossword_col,
                crossword_direction,
                crossword_number,
                points
            )

            VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?
            )
        ");


    if (!$stmt) {

        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' =>
                'Failed to prepare insert.',
            'error' =>
                $conn->error
        ]);

        $conn->close();

        exit;
    }


    $stmt->bind_param(
        'isssssssssssiisii',
        $instructorId,
        $section,
        $topic,
        $gameMode,
        $questionText,
        $answer,
        $optionA,
        $optionB,
        $optionC,
        $optionD,
        $hint,
        $jumbledWord,
        $crosswordRow,
        $crosswordCol,
        $crosswordDirection,
        $crosswordNumber,
        $points
    );


    if (!$stmt->execute()) {

        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' =>
                'Failed to save question.',
            'error' =>
                $stmt->error
        ]);

        $stmt->close();
        $conn->close();

        exit;
    }


    $questionId =
        $stmt->insert_id;


    $stmt->close();
}


/*
|--------------------------------------------------------------------------
| UPDATE EXISTING QUESTION
|--------------------------------------------------------------------------
*/

else {

    /*
     * First make sure the question belongs
     * to this instructor.
     */

    $ownershipStmt =
        $conn->prepare("
            SELECT question_id
            FROM game_questions
            WHERE question_id = ?
              AND instructor_id = ?
            LIMIT 1
        ");


    if (!$ownershipStmt) {

        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' =>
                'Failed to verify question ownership.',
            'error' =>
                $conn->error
        ]);

        $conn->close();

        exit;
    }


    $ownershipStmt->bind_param(
        'ii',
        $questionID,
        $instructorId
    );


    $ownershipStmt->execute();


    $ownershipResult =
        $ownershipStmt->get_result();


    if (!$ownershipResult->fetch_assoc()) {

        $ownershipStmt->close();
        $conn->close();

        http_response_code(403);

        echo json_encode([
            'success' => false,
            'message' =>
                'You do not own this question.'
        ]);

        exit;
    }


    $ownershipStmt->close();


    /*
     * Update.
     */

    $stmt =
        $conn->prepare("
            UPDATE game_questions

            SET
                section = ?,
                topic = ?,
                game_mode = ?,
                question_text = ?,
                answer = ?,
                option_a = ?,
                option_b = ?,
                option_c = ?,
                option_d = ?,
                hint = ?,
                jumbled_word = ?,
                crossword_row = COALESCE(?, crossword_row),
                crossword_col = COALESCE(?, crossword_col),
                crossword_direction = COALESCE(NULLIF(?, ''), crossword_direction),
                crossword_number = COALESCE(?, crossword_number),
                points = COALESCE(?, points)

            WHERE question_id = ?
              AND instructor_id = ?
        ");


    if (!$stmt) {

        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' =>
                'Failed to prepare update.',
            'error' =>
                $conn->error
        ]);

        $conn->close();

        exit;
    }

       $updatePoints =
        isset($input['points'])
            ? max(1, (int)$input['points'])
            : null;


    $stmt->bind_param(
        'sssssssssssiisiiii',
        $section,
        $topic,
        $gameMode,
        $questionText,
        $answer,
        $optionA,
        $optionB,
        $optionC,
        $optionD,
        $hint,
        $jumbledWord,
        $crosswordRow,
        $crosswordCol,
        $crosswordDirection,
        $crosswordNumber,
        $points,
        $questionID,
        $instructorId
    );


    if (!$stmt->execute()) {

        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' =>
                'Failed to update question.',
            'error' =>
                $stmt->error
        ]);

        $stmt->close();
        $conn->close();

        exit;
    }


    $questionId =
        $questionID;


    $stmt->close();
}


/*
|--------------------------------------------------------------------------
| GET SAVED QUESTION
|--------------------------------------------------------------------------
*/

$stmt =
    $conn->prepare("
        SELECT
            question_id,
            instructor_id,
            section,
            topic,
            game_mode,
            question_text,
            answer,
            option_a,
            option_b,
            option_c,
            option_d,
            hint,
            jumbled_word,
            crossword_row,
            crossword_col,
            crossword_direction,
            crossword_number,
            points,
            created_at

        FROM game_questions

        WHERE question_id = ?
          AND instructor_id = ?

        LIMIT 1
    ");


if (!$stmt) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' =>
            'Failed to prepare saved question lookup.',
        'error' =>
            $conn->error
    ]);

    $conn->close();

    exit;
}


$stmt->bind_param(
    'ii',
    $questionId,
    $instructorId
);


if (!$stmt->execute()) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' =>
            'Failed to retrieve saved question.',
        'error' =>
            $stmt->error
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


$result =
    $stmt->get_result();


$question =
    $result->fetch_assoc();


$stmt->close();
$conn->close();


/*
|--------------------------------------------------------------------------
| FINAL RESPONSE
|--------------------------------------------------------------------------
*/

if (!$question) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' =>
            'Question was saved but could not be retrieved.'
    ]);

    exit;
}


echo json_encode([
    'success' => true,
    'message' =>
        'Question saved successfully.',
    'question' =>
        $question
]);