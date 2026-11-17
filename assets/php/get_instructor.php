<?php
 
session_start();

require 'config.php';

header('Content-Type: application/json');

if(!isset($_SESSION ['instructor'])){
    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "Not Logged In"
    ]);

    exit;
}

$conn = getConnection();

$instructor_id = $_SESSION['instructor'];

$stmt = $conn -> prepare("
SELECT
    instructor_id,
    instructor_number,
    institutional_email,
    first_name,
    last_name,
    college,
    program,
    teaching_exp,
    grade,
    course_alignment,
    evaluation_updated_at
FROM instructor
WHERE instructor_id = ?
LIMIT 1");

$stmt -> bind_param("i",$instructor_id);

$stmt->execute();

$result = $stmt -> get_result();

if($result->num_rows === 0 ) {
    http_response_code(404);

    echo json_encode([
        "success" => false,
        "message" => "instructor not found"
    ]);

    exit;
}

$instructor = $result -> fetch_assoc();

// Use the actual Teaching XP earned from instructor_quiz_rewards
$instructor['teaching_xp'] = (int) ($instructor['teaching_exp'] ?? 0);

$monthlyStmt = $conn->prepare("
    SELECT COALESCE(SUM(exp_awarded), 0) AS monthly_teaching_xp
    FROM instructor_quiz_rewards
    WHERE instructor_id = ?
      AND MONTH(awarded_at) = MONTH(CURRENT_DATE())
      AND YEAR(awarded_at) = YEAR(CURRENT_DATE())
");

$monthlyStmt->bind_param("i", $instructor_id);
$monthlyStmt->execute();

$monthlyResult = $monthlyStmt->get_result();
$monthlyData = $monthlyResult->fetch_assoc();

$instructor['monthly_teaching_xp'] = (int) ($monthlyData['monthly_teaching_xp'] ?? 0);

$monthlyStmt->close();

$history = $conn->prepare("SELECT r.quiz_id,q.title,r.reward_type,r.exp_awarded,r.awarded_at FROM instructor_quiz_rewards r LEFT JOIN quizzes q ON q.quiz_id=r.quiz_id WHERE r.instructor_id=? ORDER BY r.awarded_at DESC,r.quiz_id DESC");
$history->bind_param('i',$instructor_id);$history->execute();
$instructor['xp_history']=$history->get_result()->fetch_all(MYSQLI_ASSOC);
$history->close();

echo json_encode([
    "success" => true,
    "instructor" => $instructor
]);

$stmt -> close();
$conn -> close();