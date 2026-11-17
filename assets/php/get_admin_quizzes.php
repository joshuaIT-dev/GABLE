<?php

require_once "config.php";

$conn = getConnection();

header("Content-Type: application/json");

$sql = "
    SELECT
        q.quiz_id,
        q.instructor_id,
        q.questions,
        q.title,
        q.quiz_type,
        q.subject,
        q.section,
        q.due_date,
        q.time_limit,
        q.xp_reward,
        q.instructions,
        q.status,
        CONCAT(i.first_name, ' ', i.last_name) AS instructor,
i.college AS college,
        COUNT(qs.submission_id) AS submissions
    FROM quizzes q
    LEFT JOIN instructor i
        ON q.instructor_id = i.instructor_id
    LEFT JOIN quiz_idsubmissions qs
        ON q.quiz_id = qs.quiz_id
    WHERE COALESCE(LOWER(q.status), '') <> 'removed'
    GROUP BY
        q.quiz_id,
        q.instructor_id,
        q.questions,
        q.title,
        q.quiz_type,
        q.subject,
        q.section,
        q.due_date,
        q.time_limit,
        q.xp_reward,
        q.instructions,
        q.status,
        i.first_name,
         i.last_name,
        i.college
    ORDER BY q.created_at DESC
";

$result = $conn->query($sql);

if (!$result) {
    echo json_encode([
        "success" => false,
        "message" => "Failed to load quizzes."
    ]);
    exit;
}

$quizzes = [];

while ($row = $result->fetch_assoc()) {

    
    $quizzes[] = [
        "quiz_id" => (int)$row["quiz_id"],
        "instructor_id" => (int)$row["instructor_id"],
        "questions" => json_decode($row["questions"] ?? "[]", true) ?? [],
        "title" => $row["title"],
        "instructor" => $row["instructor"] ?? "Unknown Instructor",
        "college" => $row["college"] ?? "",
        "type" => $row["quiz_type"] ?? "",
        "subject" => $row["subject"] ?? "",
        "section" => $row["section"] ?? "",
        "due_date" => $row["due_date"] ?? null,
        "time_limit" => (int)$row["time_limit"],
        "xp_reward" => (int)$row["xp_reward"],
        "instructions" => $row["instructions"] ?? "",
        "status" => strtolower($row["status"]) === "active"
            ? "Active"
            : "Draft",
        "submissions" => (int)$row["submissions"]
    ];

}

echo json_encode([
    "success" => true,
    "quizzes" => $quizzes
]);

$conn->close();