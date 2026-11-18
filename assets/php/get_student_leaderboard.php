<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__.'/config.php';
$studentId=(int)($_SESSION['student'] ?? $_SESSION['student_id'] ?? 0);
if (!$studentId) { http_response_code(401); echo json_encode(['success'=>false,'message'=>'Please sign in.']); exit; }
$subject=is_string($_GET['subject']??'') ? trim($_GET['subject']??'') : '';
try {
    $conn=getConnection();
    session_write_close();
    $stmt=$conn->prepare('SELECT student_id,student_number,college,program,year_level,block FROM student WHERE student_id=?');
    $stmt->bind_param('i',$studentId);$stmt->execute();$current=$stmt->get_result()->fetch_assoc();
    if (!$current) throw new RuntimeException('Student not found.');
    $college=trim((string)$current['college']);
    // Aggregate once, instead of recalculating the complete XP view for every student.
    $sql="SELECT s.student_id,s.student_number,s.first_name,s.last_name,s.program,s.year_level,s.block,
        COALESCE(q.earned,0)+COALESCE(g.bonus,0) total_xp,
        COALESCE(progress.lifetime_xp,0) level_xp,
        COALESCE(q.avg_score,0) avg_score,COALESCE(q.attempts,0) submissions_count
        FROM student s
        LEFT JOIN (
            SELECT qs.student_id,SUM(qs.xp_earned) earned,AVG(qs.score) avg_score,COUNT(*) attempts
            FROM quiz_idsubmissions qs JOIN quizzes quiz ON quiz.quiz_id=qs.quiz_id
            WHERE qs.submission_id>(SELECT submission_cutoff FROM current_xp_semester)
              AND qs.status IN ('submitted','graded')";
    if ($subject!=='') $sql.=" AND LOWER(TRIM(quiz.subject))=LOWER(TRIM(?))";
    $sql.=" GROUP BY qs.student_id
        ) q ON q.student_id=s.student_id
        LEFT JOIN (SELECT student_id,SUM(bonus) bonus FROM student_powerup_grants GROUP BY student_id) g ON g.student_id=s.student_id
        LEFT JOIN student_reward_progress progress ON progress.student_id=s.student_id
        WHERE TRIM(s.college)=? AND ?<>''";
    if ($subject!=='') $sql.=" AND EXISTS (
        SELECT 1 FROM (
            SELECT section COLLATE utf8mb4_unicode_ci section,subject_name COLLATE utf8mb4_unicode_ci subject FROM teaching_assignments
            UNION SELECT section COLLATE utf8mb4_unicode_ci,subject COLLATE utf8mb4_unicode_ci FROM quizzes WHERE status='active'
        ) enrollment
        WHERE LOWER(TRIM(enrollment.section)) COLLATE utf8mb4_unicode_ci=LOWER(TRIM(CONCAT(s.program,' ',s.year_level,s.block))) COLLATE utf8mb4_unicode_ci
          AND LOWER(TRIM(enrollment.subject))=LOWER(TRIM(?))
    )";
    $sql.=' ORDER BY total_xp DESC,s.last_name,s.first_name,s.student_id';
    $stmt=$conn->prepare($sql);
    if ($subject==='') $stmt->bind_param('ss',$college,$college);
    else $stmt->bind_param('ssss',$subject,$college,$college,$subject);
    $stmt->execute();$students=[];
    foreach($stmt->get_result() as $row) {
        $students[]=['id'=>(string)$row['student_number'],'student_id'=>(int)$row['student_id'],
            'name'=>trim($row['first_name'].' '.$row['last_name']), 'program'=>$row['program'],
            'year_level'=>(int)$row['year_level'],'block'=>$row['block'],
            'section'=>trim($row['program'].' '.$row['year_level'].$row['block']),
            'xp'=>(int)$row['total_xp'],'level_xp'=>(int)$row['level_xp'],'score'=>round((float)$row['avg_score'],2),'submissions'=>(int)$row['submissions_count']];
    }
    echo json_encode(['success'=>true,'scope'=>'college','college'=>$college,'student'=>[
        'id'=>(int)$current['student_id'],'student_number'=>$current['student_number'],'college'=>$college,
        'program'=>$current['program'],'year_level'=>(int)$current['year_level'],'block'=>$current['block'],
        'section'=>trim($current['program'].' '.$current['year_level'].$current['block'])
    ],'students'=>$students],JSON_INVALID_UTF8_SUBSTITUTE);
} catch(Throwable $error) {
    http_response_code(500);echo json_encode(['success'=>false,'message'=>'Failed to load your college leaderboard.']);
}
