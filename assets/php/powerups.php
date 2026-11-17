<?php
session_start();
header('Content-Type: application/json');
header('Cache-Control: no-store');
require_once __DIR__.'/config.php';
require_once __DIR__.'/ai_usage.php';
require_once __DIR__.'/platform_guard.php';
require_once __DIR__.'/powerup_service.php';
platform_block_students_if_maintenance();
$student=(int)($_SESSION['student'] ?? $_SESSION['student_id'] ?? 0);
if (!$student) { http_response_code(401); echo json_encode(['success'=>false,'message'=>'Please sign in.']); exit; }
if ($_SERVER['REQUEST_METHOD']==='POST' && stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
    http_response_code(415); echo json_encode(['success'=>false,'message'=>'JSON request required.']); exit;
}
$db=null;$locked=false;
try {
    $db=getConnection(); session_write_close(); ai_action_lock($db,'gable:powerup:'.$student,5);$locked=true; $db->begin_transaction(); pu_lock($db,$student);
    $state=pu_sync($db,$student); $response=[];
    if ($_SERVER['REQUEST_METHOD']==='POST') {
        $input=json_decode(file_get_contents('php://input'),true) ?: [];
        $action=$input['action'] ?? '';
        if($action==='claim_streak'){
            $grant=pu_row($db,"SELECT level FROM student_powerup_grants WHERE student_id=? AND type='weekly_streak' AND remaining=1 ORDER BY level DESC LIMIT 1 FOR UPDATE",[$student]);
            if(!$grant)throw new RuntimeException('No seven-day reward is ready to claim.',409);
            pu_query($db,'UPDATE student_powerup_grants SET remaining=0,bonus=100 WHERE student_id=? AND level=?',[$student,$grant['level']]);
            $state=pu_sync($db,$student);$db->commit();echo json_encode(['success'=>true,'state'=>$state]);exit;
        }
        $quiz=(int)($input['quiz_id'] ?? 0); $index=(int)($input['question_index'] ?? -1);
        $q=pu_quiz($db,$student,$quiz);
        if (pu_row($db,'SELECT submission_id FROM quiz_idsubmissions WHERE student_id=? AND quiz_id=?',[$student,$quiz])) throw new RuntimeException('This quiz has already been submitted.',409);
        if ($action==='start') {
            pu_query($db,'INSERT IGNORE INTO student_quiz_attempts(student_id,quiz_id,answers) VALUES (?,?,?)',[$student,$quiz,'{}']);
        }
        $attempt=pu_row($db,'SELECT * FROM student_quiz_attempts WHERE student_id=? AND quiz_id=?',[$student,$quiz]);
        if (!$attempt) throw new RuntimeException('Open the quiz before using a power-up.',409);
        if ($action==='start') {
            if (pu_deadline($q,time())<=time()) throw new RuntimeException('This quiz is past its due date.',403);
            if (empty($attempt['snapshot_json'])) {
                pu_query($db,'UPDATE student_quiz_attempts SET snapshot_json=? WHERE student_id=? AND quiz_id=?',[json_encode($q,JSON_THROW_ON_ERROR),$student,$quiz]);
            }
            $response['questions']=pu_public_questions($q['questions']);
            if ((int)$attempt['open_count']>=3) throw new RuntimeException('All 3 quiz openings have been used. Contact your instructor.',403);
            if ($attempt['deadline'] && time()>=(int)$attempt['deadline']) throw new RuntimeException('The time limit for this quiz has ended.',403);
            $count=(int)$attempt['open_count']+1;
            $deadline=$attempt['deadline'] ?: pu_deadline($q,time());
            $token=bin2hex(random_bytes(24));
            pu_query($db,'UPDATE student_quiz_attempts SET open_count=?,deadline=?,session_token=? WHERE student_id=? AND quiz_id=?',[$count,$deadline,$token,$student,$quiz]);
            $message='Opening '.$count.' of 3 used for '.$q['title'].'. '.($count===3 ? 'This is your last opening. Finish before closing; you cannot reopen it.' : (3-$count).' openings remain.').' The timer continues while the quiz is closed.';
            pu_query($db,'INSERT INTO student_system_notifications(student_id,quiz_id,title,message) VALUES (?,?,?,?)',[$student,$quiz,'Quiz opening '.$count.' of 3',$message]);
            if ($count===3) {
                $person=pu_row($db,'SELECT first_name,last_name,program,year_level,block FROM student WHERE student_id=?',[$student]);
                $notice=trim($person['first_name'].' '.$person['last_name']).' ('.$person['program'].' '.$person['year_level'].$person['block'].') reached opening 3 of 3 for '.$q['title'].' in '.$q['subject'].'.';
                pu_query($db,"INSERT INTO instructor_notifications(instructor_id,student_id,quiz_id,submission_id,type,title,message) VALUES (?,?,?,NULL,'final_opening','System: Final quiz opening',?)",[$q['instructor_id'],$student,$quiz,mb_substr($notice,0,255)]);
            }
            $attempt['open_count']=$count; $attempt['deadline']=$deadline; $attempt['session_token']=$token;
        } else {
            if (!$attempt['session_token'] || !hash_equals($attempt['session_token'],(string)($input['session_token'] ?? ''))) throw new RuntimeException('This quiz session is closed or was opened in another tab.',409);
            if ($action==='close') {
                pu_query($db,'UPDATE student_quiz_attempts SET session_token=NULL WHERE student_id=? AND quiz_id=?',[$student,$quiz]);
                $db->commit(); echo json_encode(['success'=>true,'state'=>$state]); exit;
            }
            if ($attempt['deadline'] && time()>=(int)$attempt['deadline']) throw new RuntimeException('Time is up. Submit your saved answers.',409);
        }
        $response+=['open_count'=>(int)$attempt['open_count'],'deadline'=>(int)$attempt['deadline'],'server_time'=>time(),'session_token'=>$attempt['session_token']];
        $answers=json_decode($attempt['answers'],true) ?: [];
        if ($action!=='start') {
            $question=$q['questions'][$index] ?? null;
            if (!$question) throw new RuntimeException('Question not found.',422);
            if (!in_array($action,['answer','fifty_fifty','hint'],true)) throw new RuntimeException('Unknown action.',400);
            if ($action==='answer') {
                $answer=$input['answer'] ?? null;
                if (($question['type'] ?? 'mc')==='mc') {
                    $choices=$question['choices'] ?? $question['opts'] ?? [];
                    if (!is_int($answer) || !isset($choices[$answer])) throw new RuntimeException('Invalid answer.',422);
                    $effect=pu_row($db,"SELECT payload FROM student_powerup_uses WHERE student_id=? AND quiz_id=? AND question_index=? AND type='fifty_fifty'",[$student,$quiz,$index]);
                    if ($effect && in_array($answer,json_decode($effect['payload'],true)['hidden'],true)) throw new RuntimeException('That option has been eliminated.',422);
                } elseif (!is_string($answer) || mb_strlen($answer)>2000) throw new RuntimeException('Answer must be at most 2000 characters.',422);
                $answers[$index]=$answer;
                pu_query($db,'UPDATE student_quiz_attempts SET answers=? WHERE student_id=? AND quiz_id=?',[json_encode($answers),$student,$quiz]);
            } else {
                $type=$action==='hint' ? 'hint' : 'fifty_fifty';
                $used=pu_row($db,'SELECT payload,xp_cost FROM student_powerup_uses WHERE student_id=? AND quiz_id=? AND question_index=? AND type=?',[$student,$quiz,$index,$type]);
                if ($used) $response=json_decode($used['payload'],true)+['cost'=>(int)$used['xp_cost']];
                else {
                    if (isset($answers[$index]) && $answers[$index]!=='') throw new RuntimeException('Use this before answering the question.',422);
                    $cost=0;
                    if ($action==='fifty_fifty') {
                        $choices=$question['choices'] ?? $question['opts'] ?? [];
                        if (($question['type'] ?? 'mc')!=='mc' || count($choices)!==4 || !isset($question['correct']) || !isset($choices[(int)$question['correct']])) throw new RuntimeException('50/50 requires a four-option multiple-choice question.',422);
                        pu_consume($db,$student,'fifty_fifty');
                        $wrong=array_values(array_diff(range(0,3),[(int)$question['correct']])); shuffle($wrong);
                        $response=['hidden'=>array_slice($wrong,0,2)];
                    } else {
                        $discount=pu_owned($db,$student,'hint_discount'); $cost=$discount ? 25 : 50;
                        if ($state['xp']<$cost) throw new RuntimeException('Not enough XP for a hint.',422);
                        ai_daily_reserve($db,'hint:'.$student,20);
                        $db->commit();
                        $response=['hint'=>pu_hint($question['text'] ?? $question['q'] ?? '')];
                        $db->begin_transaction();pu_lock($db,$student);
                        $current=pu_row($db,'SELECT session_token,deadline,answers FROM student_quiz_attempts WHERE student_id=? AND quiz_id=?',[$student,$quiz]);
                        if (!$current || !hash_equals((string)$attempt['session_token'],(string)$current['session_token']) || (int)$current['deadline']<=time() || pu_row($db,'SELECT submission_id FROM quiz_idsubmissions WHERE student_id=? AND quiz_id=?',[$student,$quiz])) throw new RuntimeException('Quiz session ended. No power-up was charged.',409);
                        $state=pu_sync($db,$student);$discount=pu_owned($db,$student,'hint_discount');$cost=$discount?25:50;
                        if ($state['xp']<$cost) throw new RuntimeException('Not enough XP for a hint.',422);

                        if ($discount) pu_consume($db,$student,'hint_discount');
                    }
                    if ($attempt['deadline'] && time()>=(int)$attempt['deadline']) throw new RuntimeException('Time is up. No power-up was charged.',409);
                    pu_query($db,'INSERT INTO student_powerup_uses(student_id,quiz_id,question_index,type,xp_cost,payload) VALUES (?,?,?,?,?,?)',[$student,$quiz,$index,$type,$cost,json_encode($response)]);
                    $response['cost']=$cost;
                }
            }
        }
        $effects=pu_query($db,'SELECT question_index,type,payload,xp_cost FROM student_powerup_uses WHERE student_id=? AND quiz_id=?',[$student,$quiz])->get_result()->fetch_all(MYSQLI_ASSOC);
        $response+=['answers'=>(object)$answers,'effects'=>$effects];
    } elseif ($_SERVER['REQUEST_METHOD']!=='GET') throw new RuntimeException('Method not allowed.',405);
    $state=pu_sync($db,$student); $db->commit();
    echo json_encode(['success'=>true,'state'=>$state]+$response);
} catch (Throwable $e) {
    if ($db) $db->rollback();
    $code=$e->getCode(); http_response_code($code>=400 && $code<=599 ? $code : 500);
    if ($code<400 || $code>599) error_log('Power-ups: '.$e->getMessage());
    echo json_encode(['success'=>false,'message'=>$code>=400 && $code<=599 ? $e->getMessage() : 'Could not save power-up changes. Please retry.']);
}
 finally {
    if ($db && $locked) ai_action_unlock($db,'gable:powerup:'.$student);
}
