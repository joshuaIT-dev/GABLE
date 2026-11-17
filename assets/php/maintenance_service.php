<?php
function maintenance_state(mysqli $db): array {
 return $db->query('SELECT enabled,generation,deadline,UNIX_TIMESTAMP() server_time FROM maintenance_state WHERE id=1')->fetch_assoc();
}
function maintenance_session_due(array $state,array $session): bool {
 return empty($session['admin']) && (!empty($session['student'])||!empty($session['student_id'])||!empty($session['instructor']))
  && (int)$state['enabled']===1 && (int)($session['maintenance_generation']??0)<(int)$state['generation'] && (int)$state['deadline']>0 && (int)$state['server_time']>=(int)$state['deadline'];
}
function maintenance_destroy_session(): void {
 if(session_status()!==PHP_SESSION_ACTIVE)session_start();
 $_SESSION=[];session_destroy();
}
function maintenance_enforce(mysqli $db): void {
 if(PHP_SAPI==='cli')return;
 $script=basename($_SERVER['SCRIPT_NAME']??'');
 if(in_array($script,['login.php','platform_status.php','logout.php'],true))return;
 if(session_status()!==PHP_SESSION_ACTIVE)session_start();
 $session=$_SESSION;
 if(session_name()==='GABLE_GAME')$session=$_SESSION['game_tabs'][$_GET['tab']??'']??[];
 if(maintenance_session_due(maintenance_state($db),$session)){
  if(session_name()==='GABLE_GAME'){
   unset($_SESSION['game_tabs'][$_GET['tab']??'']);http_response_code(401);header('Content-Type: application/json');
   echo json_encode(['success'=>false,'maintenance'=>true,'logout'=>true,'message'=>'Maintenance has started. Please sign in again when it is complete.']);exit;
  }

  maintenance_destroy_session();http_response_code(401);header('Content-Type: application/json');header('Cache-Control: no-store');
  echo json_encode(['success'=>false,'maintenance'=>true,'logout'=>true,'message'=>'Maintenance has started. Please sign in again when it is complete.']);exit;
 }
}
