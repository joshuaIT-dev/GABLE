<?php
session_start();
header('Content-Type: application/json');
header('Cache-Control: no-store');
if (empty($_SESSION['admin'])) { http_response_code(401); echo json_encode(['success'=>false]); exit; }
require_once __DIR__.'/config.php';
try {
    $db=getConnection();
    $rows=$db->query("SELECT CONCAT(TRIM(s.program),' ',s.year_level,TRIM(s.block)) AS section, COALESCE(NULLIF(TRIM(s.college),''),'College not assigned') AS college, COUNT(DISTINCT a.student_id) AS students, COUNT(*) AS final_openings FROM student_quiz_attempts a JOIN student s ON s.student_id=a.student_id JOIN quizzes q ON q.quiz_id=a.quiz_id WHERE a.open_count=3 GROUP BY s.program,s.year_level,s.block,s.college ORDER BY final_openings DESC,section")->fetch_all(MYSQLI_ASSOC);
    echo json_encode(['success'=>true,'sections'=>$rows]);
} catch(Throwable $e) { http_response_code(500); echo json_encode(['success'=>false,'message'=>'Could not load quiz alerts.']); }
