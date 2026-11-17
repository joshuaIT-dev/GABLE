<?php
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../assets/php/config.php';
$db=getConnection();
$rows=$db->query("SELECT a.student_id,a.quiz_id FROM student_quiz_attempts a JOIN student s ON s.student_id=a.student_id JOIN quizzes q ON q.quiz_id=a.quiz_id WHERE s.status='Active' AND q.status='active' AND a.open_count>0 AND a.deadline>0 AND a.deadline<=UNIX_TIMESTAMP() AND NOT EXISTS(SELECT 1 FROM quiz_idsubmissions sub WHERE sub.student_id=a.student_id AND sub.quiz_id=a.quiz_id) ORDER BY a.deadline LIMIT 100")->fetch_all(MYSQLI_ASSOC);
if(in_array('--dry-run',$argv,true)){echo count($rows)." expired attempts ready for finalization.\n";exit;}
$failed=0;
foreach($rows as $row){
 $pipes=[];
 // Isolate each attempt while reusing the same validation, grading and reward path as student submissions.
 $process=proc_open([PHP_BINARY,__DIR__.'/../assets/php/submit_idQuiz.php','--finalize',(string)$row['student_id'],(string)$row['quiz_id']],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
 if(!is_resource($process)){$failed++;continue;}
 fclose($pipes[0]);$output=stream_get_contents($pipes[1]);$error=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);$code=proc_close($process);
 $result=json_decode($output,true);
 if($code!==0||empty($result['success'])){$failed++;error_log('Quiz finalization '.$row['quiz_id'].'/'.$row['student_id'].': '.($result['message']??$error));}
}
require_once __DIR__.'/../assets/php/instructor_quiz_rewards.php';
$rewarded=0;$rewardFailures=0;
$quizzes=$db->query("SELECT q.quiz_id,q.instructor_id FROM quizzes q WHERE q.status='active' AND (q.due_date IS NULL OR q.due_date<CURRENT_DATE) AND NOT EXISTS(SELECT 1 FROM instructor_quiz_rewards r WHERE r.quiz_id=q.quiz_id AND r.reward_type='pass_rate_85')")->fetch_all(MYSQLI_ASSOC);
foreach($quizzes as $quiz){try{if(awardQuizPassRateTeachingExp($db,(int)$quiz['quiz_id'],(int)$quiz['instructor_id']))$rewarded++;}catch(Throwable $e){$rewardFailures++;error_log('Teaching reward: '.$e->getMessage());}}
echo "$rewarded teaching rewards processed.\n";
echo (count($rows)-$failed)." finalized; $failed failed.\n";
exit(($failed+$rewardFailures)?1:0);
