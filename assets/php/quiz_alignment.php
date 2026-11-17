
<?php

/**
 * ============================================================
 * GABLE - GET INSTRUCTOR QUIZ EVALUATIONS
 * ============================================================
 * File: quiz_alignment.php
 *
 * PURPOSE:
 * Retrieves quiz evaluations belonging to the
 * currently logged-in instructor.
 *
 * RETURNS:
 * 1. Individual quiz evaluation records.
 * 2. Total number of evaluated quizzes.
 * 3. Average syllabus accuracy percentage.
 * 4. Average content relevance percentage.
 * ============================================================
 */

session_start();

require_once "config.php";
require_once __DIR__."/alignment_service.php";

header("Content-Type: application/json");

$conn = getConnection();

if (!$conn) {
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed."
    ]);
    exit;
}

// Verify instructor session.
$instructorId = $_SESSION['instructor']
    ?? $_SESSION['instructor_id']
    ?? null;

if (!$instructorId) {
    echo json_encode([
        "success" => false,
        "message" => "Unauthorized access."
    ]);
    $conn->close();
    exit;
}

$instructorId = (int) $instructorId;

try {

    // Retrieve current confirmed evidence only.
    $current = alignment_current_sql();
    $stmt = $conn->prepare("
        SELECT
            e.evaluation_id,
            e.quiz_id,
            e.alignment_percentage,
            e.content_relevance_percentage,
            e.evaluated_at,
            q.title AS quiz_title,
            q.subject,
            q.section
        FROM instructor_quiz_alignment_evaluations e
        INNER JOIN quizzes q
            ON q.quiz_id = e.quiz_id
        WHERE e.instructor_id = ? AND $current
        ORDER BY e.evaluated_at DESC
    ");

    $stmt->bind_param("i", $instructorId);
    $stmt->execute();

    $result = $stmt->get_result();

    $evaluations = [];

    $totalAlignment = 0;
    $totalContentRelevance = 0;

    while ($row = $result->fetch_assoc()) {

        $row['alignment_percentage'] =
            (float) $row['alignment_percentage'];

        $row['content_relevance_percentage'] =
            (float) $row['content_relevance_percentage'];

        $totalAlignment += $row['alignment_percentage'];

        $totalContentRelevance +=
            $row['content_relevance_percentage'];

        $evaluations[] = $row;
    }

    $stmt->close();

    $evaluatedQuizCount = count($evaluations);

    // Calculate average syllabus accuracy.
    $averageAlignment = $evaluatedQuizCount > 0
        ? $totalAlignment / $evaluatedQuizCount
        : 0;

    // Calculate average content relevance.
    $averageContentRelevance = $evaluatedQuizCount > 0
        ? $totalContentRelevance / $evaluatedQuizCount
        : 0;

    echo json_encode([
        "success" => true,
        "evaluated_quiz_count" => $evaluatedQuizCount,

        "average_alignment" =>
            round($averageAlignment, 2),

        "average_content_relevance" =>
            round($averageContentRelevance, 2),

        "evaluations" => $evaluations
    ]);

} catch (Exception $e) {

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

$conn->close();
