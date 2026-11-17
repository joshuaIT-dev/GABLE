<?php

session_start();
require_once "config.php";
if(empty($_SESSION['admin'])) {http_response_code(401);header('Content-Type: application/json');echo json_encode(['success'=>false,'message'=>'Admin session required.']);exit;}


header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode([
        "success" => false,
        "message" => "Invalid request method."
    ]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$quizId = $data["quiz_id"] ?? "";
$action = $data["action"] ?? "";

if (!is_numeric($quizId) || $action !== "remove") {
    echo json_encode([
        "success" => false,
        "message" => "Missing or invalid quiz information."
    ]);
    exit;
}

if (($data['confirmation']??'') !== 'REMOVE') {http_response_code(422);echo json_encode(['success'=>false,'message'=>'Type REMOVE to confirm.']);exit;}
$quizId = (int)$quizId;
$status = "removed";

try {

    $conn = getConnection();

    $stmt = $conn->prepare("
        UPDATE quizzes
        SET status = ?
        WHERE quiz_id = ?
    ");

    if (!$stmt) {
        throw new Exception($conn->error);
    }

    $stmt->bind_param("si", $status, $quizId);

    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }

    if ($stmt->affected_rows === 0) {
        echo json_encode([
            "success" => false,
            "message" => "Quiz not found or already removed."
        ]);
        $stmt->close();
        $conn->close();
        exit;
    }

    echo json_encode([
        "success" => true,
        "message" => "Quiz removed successfully."
    ]);

    $stmt->close();
    $conn->close();

} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Failed to remove quiz.",
        "error" => $e->getMessage()
    ]);
}