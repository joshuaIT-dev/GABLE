<?php
session_start();
header('Content-Type: application/json');
header('Cache-Control: no-store');
require_once __DIR__.'/config.php';
require_once __DIR__.'/powerup_service.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success'=>false,'message'=>'POST required.']);
    exit;
}

$instructor=(int)($_SESSION['instructor'] ?? $_SESSION['instructor_id'] ?? 0);
$input=json_decode(file_get_contents('php://input'),true);
$rawStudentIds=is_array($input)?($input['student_ids'] ?? (isset($input['student_id']) ? [$input['student_id']] : [])):[];
$studentIds=[];
if (is_array($rawStudentIds)) {
    foreach ($rawStudentIds as $rawId) {
        $id=is_scalar($rawId)?filter_var($rawId,FILTER_VALIDATE_INT):false;
        if ($id===false || $id<1) {$studentIds=[];break;}
        $studentIds[]=$id;
    }
    $studentIds=array_values(array_unique($studentIds));
}
sort($studentIds,SORT_NUMERIC);
$amount=filter_var(is_array($input)?($input['amount'] ?? null):null,FILTER_VALIDATE_INT);
$rawReason=is_array($input)?($input['reason'] ?? ''):'';
$reason=is_string($rawReason)?trim($rawReason):'';
if (!$instructor || !$studentIds || count($studentIds)>100 || $amount===false || $amount<1 || $amount>500 || mb_strlen($reason)<5 || mb_strlen($reason)>200) {
    http_response_code(422);
    echo json_encode(['success'=>false,'message'=>'Choose up to 100 students, enter 1–500 XP, and provide a 5–200 character reason.']);
    exit;
}

$db=null;$inTransaction=false;
try {
    $db=getConnection();
    $db->begin_transaction();
    $inTransaction=true;
    $instructorName=pu_row($db,'SELECT CONCAT(first_name,\' \',last_name) name FROM instructor WHERE instructor_id=? AND status=?',[$instructor,'Active']);
    if (!$instructorName) throw new RuntimeException('Instructor account unavailable.',403);
    $assignedStudents=[];
    foreach ($studentIds as $student) {
        pu_lock($db,$student);
        $assigned=pu_row($db,"SELECT CONCAT(s.first_name,' ',s.last_name) student_name FROM teaching_assignments ta JOIN student s ON ta.section COLLATE utf8mb4_general_ci=CONCAT(s.program,' ',s.year_level,s.block) COLLATE utf8mb4_general_ci WHERE ta.instructor_id=? AND s.student_id=? LIMIT 1",[$instructor,$student]);
        if (!$assigned) throw new RuntimeException('You can award XP only to students in your assigned sections.',403);
        $assignedStudents[$student]=trim($assigned['student_name']);
    }
    $semester=pu_row($db,'SELECT semester_id FROM student_xp_semesters WHERE closed_at IS NULL ORDER BY semester_id DESC LIMIT 1 FOR UPDATE');
    if (!$semester) throw new RuntimeException('No active XP semester is available.',409);
    foreach ($assignedStudents as $student=>$studentName) {
        pu_query($db,'INSERT INTO instructor_student_xp_awards(student_id,instructor_id,semester_id,amount,reason) VALUES (?,?,?,?,?)',[$student,$instructor,(int)$semester['semester_id'],$amount,$reason]);
        pu_sync($db,(int)$student);
        $instructorNotice=mb_substr("Awarded {$amount} XP to {$studentName}. Reason: {$reason}",0,255);
        pu_query($db,"INSERT INTO instructor_notifications(instructor_id,student_id,quiz_id,submission_id,type,title,message) VALUES (?,?,NULL,NULL,'student_xp_award',?,?)",[$instructor,$student,'Student XP awarded',$instructorNotice]);
        $notice=trim($instructorName['name'])." awarded {$amount} Teaching XP. Reason: {$reason}";
        pu_query($db,'INSERT INTO student_system_notifications(student_id,quiz_id,title,message) VALUES (?,0,?,?)',[$student,'Teaching XP awarded',$notice]);
    }
    $db->commit();
    $inTransaction=false;
    echo json_encode(['success'=>true,'amount'=>$amount,'count'=>count($assignedStudents),'students'=>array_values($assignedStudents)]);
} catch (Throwable $error) {
    if ($db instanceof mysqli && $inTransaction) $db->rollback();
    $status=(int)$error->getCode();
    if ($status<400 || $status>599) $status=500;
    http_response_code($status);
    echo json_encode(['success'=>false,'message'=>$status===500?'Unable to record this XP award.':$error->getMessage()]);
} finally {
    if ($db instanceof mysqli) $db->close();
}
