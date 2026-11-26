<?php
function auth_fail(int $status,string $message): void {
 http_response_code($status);header('Content-Type: application/json');header('Cache-Control: no-store');echo json_encode(['success'=>false,'message'=>$message]);exit;
}
function auth_enforce(mysqli $db): void {
 if(PHP_SAPI==='cli')return;
 $endpoint=basename($_SERVER['SCRIPT_FILENAME']??'');
 if(in_array($endpoint,['login.php','logout.php','platform_status.php'],true))return;
 if(session_status()!==PHP_SESSION_ACTIVE)session_start();
 $allowed=[];
 if(str_starts_with($endpoint,'admin_')||str_starts_with($endpoint,'get_admin_')||in_array($endpoint,['add_student.php','add_instructor.php','deactivate_account.php','send_announcement.php','draft_announcement.php','get_announcement_history.php','save_instructor_evaluation.php','quiz_evaluation.php'],true))$allowed=['admin'];
 elseif(in_array($endpoint,['syllabus.php'],true))$allowed=['admin','instructor'];
 elseif(in_array($endpoint,['reviewer.php','review_history.php'],true))$allowed=[($_GET['role']??'student')==='instructor'?'instructor':'student'];
 elseif(str_starts_with($endpoint,'get_instructor')||in_array($endpoint,['award_student_xp.php','get_quiz.php','grade_submission.php','generate_ai_summary.php','IDashboard.php','quiz_alignment.php','resolve_flag.php','save_game_question.php','delete_game_question.php','get_game_questions.php','game_context.php','success_rate.php'],true))$allowed=['instructor'];
 else $allowed=['student'];
 $role=null;$id=0;
 foreach($allowed as $candidate){$value=(int)($_SESSION[$candidate]??$_SESSION[$candidate.'_id']??0);if($value){$role=$candidate;$id=$value;break;}}
 if(in_array($endpoint,['get_game_questions.php','game_context.php'],true)&&session_name()==='GABLE_GAME'){$id=(int)($_SESSION['game_tabs'][$_GET['tab']??'']['instructor']??0);$role=$id?'instructor':null;}
 if(!$id)auth_fail(401,'Please sign in with the required account.');
 $column=$role.'_id';$sql="SELECT $column".($role==='admin'?'':',status')." FROM $role WHERE $column=?";
 $stmt=$db->prepare($sql);$stmt->bind_param('i',$id);$stmt->execute();$account=$stmt->get_result()->fetch_assoc();$stmt->close();
 if(!$account||($role!=='admin'&&$account['status']!=='Active')){if(session_name()==='GABLE_GAME')unset($_SESSION['game_tabs'][$_GET['tab']??'']);unset($_SESSION[$role],$_SESSION[$role.'_id']);auth_fail(403,'This account is inactive or unavailable.');}
 if($_SERVER['REQUEST_METHOD']==='POST'&&!in_array($endpoint,['syllabus.php'],true)&&stripos($_SERVER['CONTENT_TYPE']??'','application/json')!==0)auth_fail(415,'JSON request required.');
}
