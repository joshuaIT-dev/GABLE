<?php
require_once __DIR__.'/config.php';
require_once __DIR__.'/student_semester_service.php';
header('Cache-Control: no-store');
header('Content-Type: application/json; charset=utf-8');
$db=null;
try {
    $db=getConnection();
    $admin=(int)($_SESSION['admin'] ?? $_SESSION['admin_id'] ?? 0);
    $_SESSION['semester_csrf'] ??= bin2hex(random_bytes(32));
    $method=$_SERVER['REQUEST_METHOD'];
    if ($method==='GET' && isset($_GET['download'])) {
        $id=(int)$_GET['download'];
        $export=pu_row($db,'SELECT * FROM student_xp_exports WHERE export_id=?',[$id]);
        if (!$export) throw new RuntimeException('Export not found.',404);
        $html=semester_report_html(json_decode($export['snapshot_json'],true,512,JSON_THROW_ON_ERROR),$id,$export['created_at']);
        $_SESSION['semester_downloaded']=$id;
        header('Content-Type: text/html; charset=utf-8');
        header('Content-Disposition: attachment; filename="GABLE_Semester_XP_'.$id.'.html"');
        header('X-Content-Type-Options: nosniff');
        echo $html; exit;
    }
    if ($method==='POST') {
        $input=json_decode(file_get_contents('php://input'),true,512,JSON_THROW_ON_ERROR);
        if (!hash_equals($_SESSION['semester_csrf'],(string)($input['csrf']??''))) throw new RuntimeException('Refresh this page before continuing.',403);
        $action=$input['action']??'';
        if (!in_array($action,['export','reset'],true)) throw new RuntimeException('Unknown action.',400);
        $db->begin_transaction(); semester_lock_students($db);
        if ($action==='export') {
            foreach(pu_query($db,"SELECT student_id FROM student WHERE status='Active' ORDER BY student_id")->get_result()->fetch_all(MYSQLI_ASSOC) as $row) pu_sync($db,(int)$row['student_id']);
            $snapshot=semester_snapshot($db);
            pu_query($db,'INSERT INTO student_xp_exports(semester_id,admin_id,snapshot_json,snapshot_hash) VALUES (?,?,?,?)',[$snapshot['semester']['semester_id'],$admin,json_encode($snapshot,JSON_THROW_ON_ERROR),semester_hash($snapshot)]);
            $id=$db->insert_id;
            $db->commit(); echo json_encode(['success'=>true,'export_id'=>$id]); exit;
        }
        $id=(int)($input['export_id']??0);
        if ($id<=0 || ($_SESSION['semester_downloaded']??0)!==$id || ($input['confirmation']??'')!=='RESET STUDENT XP' || ($input['saved_export']??false)!==true) throw new RuntimeException('Download and save the export, then type RESET STUDENT XP to confirm.',422);
        semester_reset($db,$id,$admin,(string)($input['label']??''));
        $db->commit(); unset($_SESSION['semester_downloaded']);
        echo json_encode(['success'=>true]); exit;
    } elseif ($method!=='GET') throw new RuntimeException('Method not allowed.',405);
    $exports=pu_query($db,'SELECT export_id,semester_id,created_at,used_at FROM student_xp_exports ORDER BY export_id DESC LIMIT 30')->get_result()->fetch_all(MYSQLI_ASSOC);
    echo json_encode(['success'=>true,'semester'=>semester_current($db),'exports'=>$exports,'csrf'=>$_SESSION['semester_csrf']]);
} catch (Throwable $error) {
    if ($db) $db->rollback();
    $code=(int)$error->getCode();$safe=$code>=400&&$code<=499;
    http_response_code($safe?$code:500);
    echo json_encode(['success'=>false,'message'=>$safe?$error->getMessage():'Could not complete the semester operation. No reset was committed.']);
}
