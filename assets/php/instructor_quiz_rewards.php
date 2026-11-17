<?php
require_once __DIR__.'/powerup_service.php';
function awardQuizPassRateTeachingExp(mysqli $conn,int $quizId,int $instructorId): bool {
    $conn->begin_transaction();
    try {
        $quiz=pu_row($conn,'SELECT section,due_date FROM quizzes WHERE quiz_id=? AND instructor_id=? FOR UPDATE',[$quizId,$instructorId]);
        if (!$quiz || pu_row($conn,"SELECT quiz_id FROM instructor_quiz_rewards WHERE quiz_id=? AND reward_type='pass_rate_85'",[$quizId])) { $conn->commit();return false; }
        if (!empty($quiz['due_date']) && time()<=strtotime($quiz['due_date'].' 23:59:59')) { $conn->commit();return false; }
        $setting=pu_row($conn,"SELECT setting_value FROM system_settings WHERE setting_key='xp_pass_rate_85_enabled'");
        if ($setting && !(int)$setting['setting_value']) { $conn->commit();return false; }
        // Missing submissions count toward the enrolled class denominator, not as passing students.
        $stats=pu_row($conn,"SELECT COUNT(*) enrolled,COALESCE(SUM(sub.status IN ('submitted','graded')),0) completed,COALESCE(SUM(sub.status='pending_review'),0) pending,COALESCE(SUM(sub.status IN ('submitted','graded') AND sub.score>=80),0) passed FROM student s LEFT JOIN quiz_idsubmissions sub ON sub.student_id=s.student_id AND sub.quiz_id=? WHERE s.status='Active' AND LOWER(CONCAT(TRIM(s.program),' ',s.year_level,REPLACE(UPPER(TRIM(s.block)),'SECTION ',''))) COLLATE utf8mb4_unicode_ci=LOWER(TRIM(?)) COLLATE utf8mb4_unicode_ci",[$quizId,$quiz['section']]);
        $enrolled=(int)$stats['enrolled'];$passed=(int)$stats['passed'];
        // An undated quiz becomes final only once the whole current class has a graded submission.
        if (!$enrolled || (int)$stats['pending'] || (empty($quiz['due_date']) && (int)$stats['completed']<$enrolled) || $passed/$enrolled<0.85) { $conn->commit();return false; }
        $rate=round($passed/$enrolled*100,2);
        pu_query($conn,"INSERT INTO instructor_quiz_rewards(quiz_id,instructor_id,reward_type,exp_awarded,pass_rate,valid_submissions,passed_submissions) VALUES (?,?,'pass_rate_85',50,?,?,?)",[$quizId,$instructorId,$rate,$enrolled,$passed]);
        pu_query($conn,'UPDATE instructor SET teaching_exp=COALESCE(teaching_exp,0)+50 WHERE instructor_id=?',[$instructorId]);
        $conn->commit();return true;
    } catch(Throwable $e) { $conn->rollback();throw $e; }
}
