<?php
session_start();header('Content-Type: application/json');header('Cache-Control: no-store');
require_once __DIR__.'/config.php';require_once __DIR__.'/alignment_service.php';
$admin=(int)($_SESSION['admin']??0);$teacher=(int)($_SESSION['instructor']??0);
try {
 if(!$admin&&!$teacher)throw new RuntimeException('Please sign in.',401);
 $db=getConnection();$action=$_GET['action']??'list';
 $_SESSION['syllabus_csrf']??=bin2hex(random_bytes(24));
 $input=[];
 if(!in_array($action,['list','download','text'],true)){
  if($_SERVER['REQUEST_METHOD']!=='POST')throw new RuntimeException('POST required.',405);
  $input=json_decode(file_get_contents('php://input'),true)?:[];
  $token=$_POST['csrf']??$input['csrf']??'';
  if(!is_string($token)||!hash_equals($_SESSION['syllabus_csrf'],$token))throw new RuntimeException('Refresh the page before continuing.',403);
 }
 if($action==='text'){
  $row=pu_row($db,'SELECT id,instructor_id,content,status,filename FROM instructor_syllabi WHERE id=?',[(int)($_GET['id']??0)]);
  if(!$row||(!$admin&&(int)$row['instructor_id']!==$teacher))throw new RuntimeException('Syllabus not found.',404);
  echo json_encode(['success'=>true,'syllabus'=>$row]);exit;
 }
 if($action==='accept'){
  if(!$admin||($input['text_confirmed']??false)!==true)throw new RuntimeException('Admin must compare and confirm the analyzed text against the original document.',422);
  $db->begin_transaction();$row=pu_row($db,'SELECT * FROM instructor_syllabi WHERE id=? FOR UPDATE',[(int)($input['id']??0)]);
  if(!$row||$row['status']!=='pending')throw new RuntimeException('Syllabus is no longer awaiting acceptance.',409);
  pu_row($db,'SELECT instructor_id FROM instructor WHERE instructor_id=? FOR UPDATE',[$row['instructor_id']]);
  pu_query($db,"UPDATE instructor_syllabi SET status='replaced' WHERE instructor_id=? AND subject=? AND status='active'",[$row['instructor_id'],$row['subject']]);
  pu_query($db,"UPDATE instructor_syllabi SET status='active',accepted_by=?,accepted_at=NOW() WHERE id=?",[$admin,$row['id']]);
  alignment_notice($db,(int)$row['instructor_id'],null,'Syllabus #'.$row['id'].' for '.$row['subject'].' accepted. Quiz alignment checks are queued.');$db->commit();
 }
 if($action==='reject_syllabus'){
  $reason=trim($input['reason']??'');if(!$admin||mb_strlen($reason)<10||mb_strlen($reason)>2000)throw new RuntimeException('Admin must explain the correction needed in 10–2000 characters.',422);
  $db->begin_transaction();$row=pu_row($db,'SELECT * FROM instructor_syllabi WHERE id=? FOR UPDATE',[(int)($input['id']??0)]);
  if(!$row||$row['status']!=='pending')throw new RuntimeException('Syllabus is no longer awaiting acceptance.',409);
  pu_query($db,"UPDATE instructor_syllabi SET status='rejected' WHERE id=?",[$row['id']]);alignment_notice($db,(int)$row['instructor_id'],null,'Syllabus #'.$row['id'].' requires a corrected upload: '.$reason);$db->commit();
 }
 if(in_array($action,['request_revision','respond'],true)){
  $message=trim($input['message']??'');if(mb_strlen($message)<10||mb_strlen($message)>2000)throw new RuntimeException('Write a reason or response of 10–2000 characters.',422);
  $db->begin_transaction();$r=pu_row($db,'SELECT r.*,q.instructor_id FROM syllabus_reviews r JOIN quizzes q ON q.quiz_id=r.quiz_id WHERE r.id=? FOR UPDATE',[(int)($input['id']??0)]);
  if(!$r||(!$admin&&(int)$r['instructor_id']!==$teacher))throw new RuntimeException('Review not found.',404);
  if($action==='request_revision'){
   if(!$admin||!in_array($r['status'],['review','approved'],true))throw new RuntimeException('Admin review required.',409);
   pu_query($db,"UPDATE syllabus_reviews SET status='revision_requested',updated_at=NOW() WHERE id=?",[$r['id']]);
  }else{
   if(!$teacher||!in_array($r['status'],['revision_requested','approved'],true))throw new RuntimeException('An instructor may respond to a revision request or appeal a confirmed review.',409);
   pu_query($db,"UPDATE syllabus_reviews SET status='review',updated_at=NOW() WHERE id=?",[$r['id']]);
  }
  alignment_event($db,(int)$r['id'],$admin?'admin':'instructor',$admin?:$teacher,$action,$message);
  alignment_notice($db,(int)$r['instructor_id'],(int)$r['quiz_id'],'Quiz #'.$r['quiz_id'].': '.($action==='respond'?'Instructor response submitted. ':'Revision requested. ').$message);$db->commit();
 }

 if($action==='download'){
  $row=pu_row($db,'SELECT * FROM instructor_syllabi WHERE id=?',[(int)($_GET['id']??0)]);
  if(!$row||(!$admin&&(int)$row['instructor_id']!==$teacher))throw new RuntimeException('File not found.',404);
  header('Content-Type: application/octet-stream');header('X-Content-Type-Options: nosniff');header('Content-Disposition: attachment; filename="'.preg_replace('/[^A-Za-z0-9_.-]/','_',$row['filename']).'"');echo $row['file_data'];exit;
 }
 if($action==='upload'){
  if($_SERVER['REQUEST_METHOD']!=='POST'||!$teacher)throw new RuntimeException('Instructor upload required.',403);
  if(empty($_SESSION['syllabus_csrf'])||!hash_equals($_SESSION['syllabus_csrf'],(string)($_POST['csrf']??'')))throw new RuntimeException('Refresh this page before uploading.',403);
  $file=$_FILES['file']??null;$subject=trim($_POST['subject']??'');$content=trim($_POST['content']??'');
  if(!$file||$file['error']!==UPLOAD_ERR_OK||$file['size']>5000000||!in_array(strtolower(pathinfo($file['name'],PATHINFO_EXTENSION)),['txt','pdf','docx'],true))throw new RuntimeException('Choose a TXT, PDF or DOCX file under 5 MB.',422);
  if(!$subject||mb_strlen($subject)>255)throw new RuntimeException('Enter a subject.',422);
  if(!pu_row($db,'SELECT instructor_id FROM teaching_assignments WHERE instructor_id=? AND subject_name=?',[$teacher,$subject]))throw new RuntimeException('Choose one of your assigned subjects.',403);
  $bytes=file_get_contents($file['tmp_name']);if(strtolower(pathinfo($file['name'],PATHINFO_EXTENSION))==='txt')$content=$bytes;
  if(strtolower(pathinfo($file['name'],PATHINFO_EXTENSION))==='docx' && class_exists('ZipArchive')) {
   $zip=new ZipArchive();if($zip->open($file['tmp_name'])!==true)throw new RuntimeException('Invalid DOCX file.',422);
   $stat=$zip->statName('word/document.xml');if(!$stat||$stat['size']>2000000)throw new RuntimeException('DOCX content is missing or too large.',422);
   $xml=$zip->getFromName('word/document.xml');$zip->close();$xml=preg_replace('/<w:(tab|br)\\b[^>]*\\/>/',' ',$xml);$content=html_entity_decode(strip_tags(str_replace('</w:p>',"\n\n",$xml)),ENT_QUOTES|ENT_XML1,'UTF-8');
  }
  if(mb_strlen($content)<50||mb_strlen($content)>60000)throw new RuntimeException('Provide 50-60000 characters of readable syllabus text. For PDF/DOCX, paste its text below.',422);
  $db->begin_transaction();pu_query($db,'INSERT INTO instructor_syllabi(instructor_id,subject,filename,file_data,content) VALUES (?,?,?,?,?)',[$teacher,$subject,basename($file['name']),$bytes,$content]);
  pu_query($db,'INSERT INTO syllabus_alerts(title,message) VALUES (?,?)',['System: Syllabus uploaded','Instructor #'.$teacher.' uploaded '.basename($file['name']).' for '.$subject.'. Admin acceptance of the analyzed text is pending.']);$db->commit();
 }
 if($action==='retry'){
  $r=pu_row($db,'SELECT r.*,s.instructor_id FROM syllabus_reviews r JOIN instructor_syllabi s ON s.id=r.syllabus_id WHERE r.id=?',[(int)($input['id']??0)]);
  if(!$r||(!$admin&&(int)$r['instructor_id']!==$teacher))throw new RuntimeException('Review not found.',404);
  if((int)$r['attempts']>=3)throw new RuntimeException('This revision has reached its three analysis attempts. Correct the quiz or syllabus before reassessment.',409);
  $stmt=pu_query($db,"UPDATE syllabus_reviews SET status='queued',updated_at=NOW() WHERE id=? AND (status='failed' OR (status='pending' AND updated_at<DATE_SUB(NOW(),INTERVAL 5 MINUTE)))",[$r['id']]);
  if(!$stmt->affected_rows)throw new RuntimeException('Analysis is already running or unavailable for retry.',409);
 }
 if($action==='check'){session_write_close();set_time_limit(90);alignment_run_one($db,$admin?0:$teacher);}
 if($action==='approve'){
  if(!$admin)throw new RuntimeException('Admin approval required.',403);
  $rewardMessage=alignment_approve($db,$admin,$input);
 }
 $_SESSION['syllabus_csrf']??=bin2hex(random_bytes(24));
 $where=$admin?'1=1':'s.instructor_id='.(int)$teacher;
 $files=$db->query("SELECT s.id,s.instructor_id,s.subject,s.filename,s.created_at,s.status,s.accepted_at,i.college,CONCAT_WS(' ',i.first_name,i.last_name) instructor_name FROM instructor_syllabi s JOIN instructor i ON i.instructor_id=s.instructor_id WHERE $where ORDER BY s.id DESC")->fetch_all(MYSQLI_ASSOC);
 $reviews=$db->query("SELECT r.*,q.title,s.subject,s.instructor_id,s.status syllabus_status,q.subject current_subject,q.questions current_questions,q.status quiz_status,(SELECT COALESCE(SUM(w.exp_awarded),0) FROM instructor_quiz_rewards w WHERE w.quiz_id=r.quiz_id AND w.reward_type IN ('alignment_95','syllabus_alignment')) quiz_reward_total FROM syllabus_reviews r JOIN instructor_syllabi s ON s.id=r.syllabus_id JOIN quizzes q ON q.quiz_id=r.quiz_id WHERE $where ORDER BY r.id DESC")->fetch_all(MYSQLI_ASSOC);
 $eventRows=$db->query("SELECT ev.* FROM syllabus_review_events ev JOIN syllabus_reviews r ON r.id=ev.review_id JOIN instructor_syllabi s ON s.id=r.syllabus_id WHERE $where ORDER BY ev.id")->fetch_all(MYSQLI_ASSOC);
 $events=[];foreach($eventRows as $event)$events[$event['review_id']][]=$event;
 foreach($reviews as &$review){
  if($review['syllabus_status']!=='active'||$review['current_subject']!==$review['subject']||$review['quiz_status']!=='active'||hash('sha256',$review['current_questions']??'')!==$review['fingerprint']||(int)$review['rubric_version']!==1)$review['status']='stale';
  unset($review['current_questions']);
  $review['events']=$events[$review['id']]??[];
 }
 unset($review);
 $owner=$admin?'1=1':'q.instructor_id='.(int)$teacher;
 $missing=$db->query("SELECT q.quiz_id,q.title,q.subject,q.instructor_id FROM quizzes q WHERE $owner AND q.status='active' AND NOT EXISTS(SELECT 1 FROM instructor_syllabi s WHERE s.instructor_id=q.instructor_id AND s.subject=q.subject AND s.status='active')")->fetch_all(MYSQLI_ASSOC);
 $subjects=$teacher?pu_query($db,'SELECT DISTINCT subject_name FROM teaching_assignments WHERE instructor_id=?',[$teacher])->get_result()->fetch_all(MYSQLI_ASSOC):[];
 echo json_encode(['success'=>true,'reward_message'=>$rewardMessage??null,'missing'=>$missing,'files'=>$files,'reviews'=>$reviews,'subjects'=>$subjects,'csrf'=>$_SESSION['syllabus_csrf'],'instructors'=>$admin?$db->query("SELECT instructor_id,CONCAT_WS(' ',first_name,last_name) name,COALESCE(NULLIF(college,''),'Unassigned') college FROM instructor ORDER BY college,first_name,last_name")->fetch_all(MYSQLI_ASSOC):[],'alerts'=>$admin?$db->query('SELECT * FROM syllabus_alerts ORDER BY id DESC LIMIT 30')->fetch_all(MYSQLI_ASSOC):[]]);
}catch(Throwable $e){if(isset($db))$db->rollback();$code=(int)$e->getCode();http_response_code($code>=400&&$code<600?$code:500);error_log($e->getMessage());echo json_encode(['success'=>false,'message'=>$code>=400&&$code<600?$e->getMessage():'Could not process syllabus.']);}
