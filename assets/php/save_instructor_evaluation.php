<?php

session_start();
require_once "config.php";
require_once __DIR__.'/instructor_rank.php';
if(empty($_SESSION['admin'])){http_response_code(401);header('Content-Type: application/json');echo json_encode(['success'=>false,'message'=>'Admin session required.']);exit;}


header("Content-Type: application/json");

try {

    $conn = getConnection();

    // Only accept POST requests.
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        http_response_code(405);

        echo json_encode([
            "success" => false,
            "message" => "Invalid request method."
        ]);
        exit;
    }

    // Read JSON input.
    $data = json_decode(file_get_contents("php://input"), true);

    $instructorId = $data["instructor_id"] ?? null;
    $grade = strtoupper(trim($data["grade"] ?? ""));
    $courseAlignment = $data["course_alignment"] ?? null;

    // Validate instructor ID.
    if (
        !$instructorId ||
        !is_numeric($instructorId) ||
        (int)$instructorId <= 0
    ) {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Invalid instructor ID."
        ]);
        exit;
    }

    $instructorId = (int)$instructorId;

    // Validate overall instructor grade.
    if (!in_array($grade, ["SSS+","SSS","SS","S","A","B","C","F"], true)) {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Please provide a valid instructor grade."
        ]);
        exit;
    }

    // Validate course alignment.
    if (
        $courseAlignment === null ||
        $courseAlignment === "" ||
        !is_numeric($courseAlignment) ||
        (string)(int)$courseAlignment !== (string)$courseAlignment ||
        (int)$courseAlignment < 0 ||
        (int)$courseAlignment > 100
    ) {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Course alignment must be a whole number from 0 to 100."
        ]);
        exit;
    }

    require_once __DIR__.'/alignment_service.php';
    $evidence=$conn->prepare('SELECT COUNT(*) n,COALESCE(AVG(e.alignment_percentage),0) average_alignment FROM instructor_quiz_alignment_evaluations e WHERE e.instructor_id=? AND '.alignment_current_sql());
    $evidence->bind_param('i',$instructorId);$evidence->execute();$metrics=$evidence->get_result()->fetch_assoc();$evidence->close();
    $rankError=instructor_rank_error($grade,(int)$courseAlignment,(int)$metrics['n'],(float)$metrics['average_alignment']);
    if($rankError){http_response_code(422);echo json_encode(['success'=>false,'message'=>$rankError]);exit;}


    // Update instructor evaluation only.
    // Individual quiz grades are not modified.
    $stmt = $conn->prepare("
        UPDATE instructor
    SET
        grade = ?,
        course_alignment = ?,
        evaluation_updated_at = NOW()
    WHERE instructor_id = ?
    ");

    if (!$stmt) {
        throw new Exception("Failed to prepare database query.");
    }

    $stmt->bind_param(
    "sii",
    $grade,
    $courseAlignment,
    $instructorId
);

    if (!$stmt->execute()) {
        throw new Exception("Failed to save instructor evaluation.");
    }

    // Check whether the instructor exists.
    if ($stmt->affected_rows === 0) {

        $check = $conn->prepare("
            SELECT instructor_id
            FROM instructor
            WHERE instructor_id = ?
        ");

        $check->bind_param("i", $instructorId);
        $check->execute();

        $result = $check->get_result();

        if ($result->num_rows === 0) {
            http_response_code(404);

            echo json_encode([
                "success" => false,
                "message" => "Instructor not found."
            ]);

            $check->close();
            $stmt->close();
            $conn->close();
            exit;
        }

        $check->close();
    }

    // Retrieve the updated evaluation timestamp.
    $timestampQuery = $conn->prepare("
        SELECT evaluation_updated_at,teaching_exp
        FROM instructor
        WHERE instructor_id = ?
    ");

    $timestampQuery->bind_param("i", $instructorId);
    $timestampQuery->execute();

    $timestampResult = $timestampQuery->get_result();
    $timestampRow = $timestampResult->fetch_assoc();

    echo json_encode([
    "success" => true,
    "message" => "Instructor evaluation saved successfully.",
    "grade" => $grade,
    "course_alignment" => $courseAlignment,
    "teaching_xp" => (int)$timestampRow["teaching_exp"],
    "evaluation_updated_at" => $timestampRow["evaluation_updated_at"]
]);

    $timestampQuery->close();
    $stmt->close();
    $conn->close();

} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Failed to save instructor evaluation.",
        "error" => $e->getMessage()
    ]);
}