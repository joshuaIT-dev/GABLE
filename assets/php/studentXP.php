<?php
session_start();
header('Content-Type: application/json');
header('Cache-Control: no-store');
require_once __DIR__.'/config.php';
require_once __DIR__.'/platform_guard.php';
require_once __DIR__.'/powerup_service.php';
platform_block_students_if_maintenance();
$student=(int)($_SESSION['student'] ?? $_SESSION['student_id'] ?? 0);
if (!$student) { http_response_code(401); echo json_encode(['success'=>false,'message'=>'Please sign in.']); exit; }
try {
    $db=getConnection(); $db->begin_transaction(); pu_lock($db,$student);
    $state=pu_sync($db,$student); $db->commit();
    echo json_encode(['success'=>true]+$state);
} catch (Throwable $e) {
    if (isset($db)) $db->rollback();
    http_response_code(500); echo json_encode(['success'=>false,'message'=>'Could not load XP.']);
}
