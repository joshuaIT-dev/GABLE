<?php

$gameSession = ($_GET['game'] ?? '') === '1';
$gameTab = strtolower((string)($_GET['tab'] ?? ''));
if ($gameSession) session_name('GABLE_GAME');
session_start();

header('Content-Type: application/json');

require_once 'config.php';


/*
|--------------------------------------------------------------------------
| CHECK INSTRUCTOR LOGIN
|--------------------------------------------------------------------------
*/

$instructorId =
    ($gameSession ? ($_SESSION['game_tabs'][$gameTab]['instructor'] ?? null) : ($_SESSION['instructor'] ?? $_SESSION['instructor_id'] ?? null));


if (($gameSession && (!preg_match('/^[a-f0-9]{64}$/', $gameTab) || empty($_SESSION['game_tabs'][$gameTab]))) || (!$gameSession && !$instructorId)) {

    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Instructor session not found.'
    ]);

    exit;
}


$conn = getConnection();


/*
|--------------------------------------------------------------------------
| FILTERS
|--------------------------------------------------------------------------
*/

$section =
    trim($_GET['section'] ?? '');


$topic =
    trim($_GET['topic'] ?? '');


$mode =
    trim($_GET['game_mode'] ?? '');


/*
|--------------------------------------------------------------------------
| BASE QUERY
|--------------------------------------------------------------------------
*/

$sql = "
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

    WHERE instructor_id = ?
";


$types = 'i';

$params = [
    $instructorId
];


if ($section !== '') {

    $sql .= "
        AND section = ?
    ";

    $types .= 's';

    $params[] = $section;
}


if ($topic !== '') {

    $sql .= "
        AND topic = ?
    ";

    $types .= 's';

    $params[] = $topic;
}


if ($mode !== '') {

    $sql .= "
        AND game_mode = ?
    ";

    $types .= 's';

    $params[] = $mode;
}


$sql .= "
    ORDER BY question_id ASC
";


$stmt =
    $conn->prepare($sql);


if (!$stmt) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Failed to prepare query.',
        'error' => $conn->error
    ]);

    $conn->close();

    exit;
}


/*
|--------------------------------------------------------------------------
| BIND DYNAMIC PARAMETERS
|--------------------------------------------------------------------------
*/

$stmt->bind_param(
    $types,
    ...$params
);


$stmt->execute();


$result =
    $stmt->get_result();


$questions = [];


while ($row = $result->fetch_assoc()) {

    /*
     * Convert numeric values back to numbers.
     */

    $row['question_id'] =
        (int)$row['question_id'];

    $row['instructor_id'] =
        (int)$row['instructor_id'];

    $row['points'] =
        (int)$row['points'];


    if ($row['crossword_row'] !== null) {
        $row['crossword_row'] =
            (int)$row['crossword_row'];
    }


    if ($row['crossword_col'] !== null) {
        $row['crossword_col'] =
            (int)$row['crossword_col'];
    }


    if ($row['crossword_number'] !== null) {
        $row['crossword_number'] =
            (int)$row['crossword_number'];
    }


    /*
     * Provide frontend-friendly aliases.
     */

    if ($row['game_mode'] === 'hotseat') {

        $row['word'] =
            $row['answer'];

    }


    if ($row['game_mode'] === 'crossword') {

        $row['clue'] =
            $row['hint'];

    }


    if ($row['game_mode'] === 'jumble') {

        $row['correct_word'] =
            $row['answer'];

        $row['jumble'] =
            $row['jumbled_word'];

    }


    if (
        $row['game_mode'] === 'buzzer' ||
        $row['game_mode'] === 'kahoot'
    ) {

        $row['correct_answer'] =
            $row['answer'];

    }


    $questions[] =
        $row;
}


$stmt->close();
$conn->close();


echo json_encode([
    'success' => true,
    'questions' => $questions
]);