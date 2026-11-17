<?php
require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
function semRows(mysqli $conn, string $sql): array {
    $result = $conn->query($sql);
    if (!$result) throw new Exception($conn->error);
    $rows = [];
    while ($row = $result->fetch_assoc()) $rows[] = $row;
    $result->free();
    return $rows;
}
try {
    $conn = getConnection();
    $metrics = semRows($conn, "SELECT
      (SELECT COUNT(*) FROM student WHERE LOWER(TRIM(status))='active') active_students,
      (SELECT COUNT(*) FROM instructor WHERE LOWER(TRIM(status))='active') active_instructors,
      (SELECT COUNT(*) FROM quizzes WHERE LOWER(TRIM(status))='active') active_quizzes,
      (SELECT COUNT(*) FROM quiz_idsubmissions WHERE LOWER(TRIM(status)) IN ('submitted','graded')) completed_submissions,
      (SELECT COUNT(*) FROM quiz_idsubmissions WHERE LOWER(TRIM(status)) IN ('submitted','graded') AND score IS NOT NULL) scored_submissions,
      (SELECT ROUND(AVG(score),2) FROM quiz_idsubmissions WHERE LOWER(TRIM(status)) IN ('submitted','graded') AND score IS NOT NULL) average_score,
      (SELECT COALESCE(SUM(xp_earned),0) FROM quiz_idsubmissions WHERE LOWER(TRIM(status)) IN ('submitted','graded')) total_xp,
      (SELECT COUNT(*) FROM flags WHERE status='pending') pending_flags,
      (SELECT COUNT(*) FROM flags WHERE status='resolved') resolved_flags")[0];
    $colleges = semRows($conn, "SELECT s.college,
      COUNT(DISTINCT s.student_id) students,
      COUNT(DISTINCT qs.submission_id) submissions,
      ROUND(AVG(qs.score),2) average_score,
      COALESCE(SUM(qs.xp_earned),0) total_xp
      FROM student s LEFT JOIN quiz_idsubmissions qs ON qs.student_id=s.student_id AND LOWER(TRIM(qs.status)) IN ('submitted','graded')
      WHERE LOWER(TRIM(s.status))='active'
      GROUP BY s.college ORDER BY s.college");
    $students = semRows($conn, "SELECT s.student_id, CONCAT_WS(' ',s.first_name,s.last_name) name, s.college,s.program,s.year_level,s.block,
      COALESCE(SUM(qs.xp_earned),0) xp, ROUND(AVG(qs.score),2) average_score, COUNT(qs.submission_id) submissions
      FROM student s LEFT JOIN quiz_idsubmissions qs ON qs.student_id=s.student_id AND LOWER(TRIM(qs.status)) IN ('submitted','graded')
      WHERE LOWER(TRIM(s.status))='active' GROUP BY s.student_id,s.first_name,s.last_name,s.college,s.program,s.year_level,s.block
      ORDER BY xp DESC, average_score DESC, name ASC LIMIT 10");
    $instructors = semRows($conn, "SELECT i.instructor_id, CONCAT_WS(' ',i.first_name,i.last_name) name,i.college,i.program,i.grade,i.teaching_exp,
      COUNT(DISTINCT q.quiz_id) quizzes_created, COUNT(DISTINCT qs.submission_id) submissions, ROUND(AVG(qs.score),2) average_score
      FROM instructor i LEFT JOIN quizzes q ON q.instructor_id=i.instructor_id
      LEFT JOIN quiz_idsubmissions qs ON qs.quiz_id=q.quiz_id AND LOWER(TRIM(qs.status)) IN ('submitted','graded')
      WHERE LOWER(TRIM(i.status))='active' GROUP BY i.instructor_id,i.first_name,i.last_name,i.college,i.program,i.grade,i.teaching_exp
      ORDER BY i.grade ASC, average_score DESC, quizzes_created DESC, name ASC");
    $flags = semRows($conn, "SELECT f.flag_id,f.quiz_id,q.title quiz_title,f.student_id,CONCAT_WS(' ',s.first_name,s.last_name) student_name,
      f.question_index,f.reason,f.status,f.created_at,f.resolved_at
      FROM flags f LEFT JOIN quizzes q ON q.quiz_id=f.quiz_id LEFT JOIN student s ON s.student_id=f.student_id
      ORDER BY CASE WHEN f.status='pending' THEN 0 ELSE 1 END, f.created_at DESC");
    $latest = semRows($conn, "SELECT MAX(dt) latest_activity FROM (
      SELECT MAX(submitted_at) dt FROM quiz_idsubmissions UNION ALL SELECT MAX(created_at) dt FROM quizzes
    ) activity_dates")[0]['latest_activity'] ?? null;
    echo json_encode(['success'=>true,'metrics'=>$metrics,'colleges'=>$colleges,'top_students'=>$students,'instructors'=>$instructors,'flags'=>$flags,
      'meta'=>['academic_period'=>'AY 2025–2026, 2nd Semester','data_scope'=>'Current database snapshot; source tables do not identify academic year/semester per record.','latest_activity'=>$latest,'instructor_grade_source'=>'Stored instructor.grade field; average score and quiz/submission counts are separate activity measures.']], JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
    $conn->close();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Unable to build semester report data.','error'=>$e->getMessage()]);
}
