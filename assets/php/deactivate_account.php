<?php

session_start();
require_once "config.php";

$conn = getConnection();

header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode([
        "success" => false,
        "message" => "Invalid request method."
    ]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$type   = $data["type"] ?? "";
$id     = $data["id"] ?? "";
$status = $data["status"] ?? "";

$required = $status === 'Active' ? 'ACTIVATE' : 'DEACTIVATE';
if (($data['confirmation'] ?? '') !== $required) {
    http_response_code(422);
    echo json_encode(['success'=>false,'message'=>'Type '.$required.' to continue.']);
    exit;
}

if (
    !$type ||
    !$id ||
    !is_numeric($id) ||
    !in_array($status, ["Active", "Inactive"], true)
) {
    echo json_encode([
        "success" => false,
        "message" => "Missing or invalid account information."
    ]);
    exit;
}

$id = (int)$id;

if ($type === "student") {

   $stmt = $conn->prepare("
    UPDATE student
    SET status = ?
    WHERE student_id = ?
");

} elseif ($type === "instructor") {

    $stmt = $conn->prepare("
    UPDATE instructor
    SET status = ?
    WHERE instructor_id = ?
");

} else {

    echo json_encode([
        "success" => false,
        "message" => "Invalid account type."
    ]);
    exit;
}

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Database error."
    ]);
    exit;
}

$stmt->bind_param("si", $status, $id);

if (!$stmt->execute()) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to update account status."
    ]);

    $stmt->close();
    $conn->close();
    exit;
}

if ($stmt->affected_rows === 0) {

    echo json_encode([
        "success" => false,
        "message" => "Account not found or already inactive."
    ]);

    $stmt->close();
    $conn->close();
    exit;
}

echo json_encode([
    "success" => true,
    "message" => "Account status updated successfully."
]);

$stmt->close();
$conn->close();
