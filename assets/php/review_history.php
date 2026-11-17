<?php
session_start();
header('Content-Type: application/json'); header('Cache-Control: no-store');
require_once __DIR__.'/config.php';
require_once __DIR__.'/review_history_service.php';
try {
    $role=$_GET['role']??'student';
    if (!in_array($role,['student','instructor'],true)) throw new RuntimeException('Invalid role.',422);
    $owner=(int)($_SESSION[$role]??($role==='student'?($_SESSION['student_id']??0):0));
    if (!$owner) throw new RuntimeException('Please sign in.',401);
    session_write_close(); $db=getConnection();
    if ($_SERVER['REQUEST_METHOD']==='POST') {
        if (stripos($_SERVER['CONTENT_TYPE']??'','application/json')!==0) throw new RuntimeException('JSON required.',415);
        $input=json_decode(file_get_contents('php://input'),true)?:[];
        if (($input['action']??'')==='delete') {
            pu_query($db,'UPDATE ai_review_versions v JOIN ai_review_sets s ON s.id=v.set_id SET v.hidden=1 WHERE v.id=? AND s.role=? AND s.owner_id=?',[(int)($input['id']??0),$role,$owner]);
        } elseif (($input['action']??'')==='weakspot' && $role==='student') {
            $rows=pu_query($db,"SELECT q.subject,ROUND(AVG(s.score),1) average_score,COUNT(*) attempts FROM quiz_idsubmissions s JOIN quizzes q ON q.quiz_id=s.quiz_id WHERE s.student_id=? AND s.status IN ('submitted','graded') AND s.score IS NOT NULL GROUP BY q.subject ORDER BY q.subject",[$owner])->get_result()->fetch_all(MYSQLI_ASSOC);
            if ($rows) {
                $context=json_encode(['subjects'=>$rows,'source'=>review_source_hash($db,review_identity('weakspot:'.$owner))],JSON_THROW_ON_ERROR);
                $text=implode("\n",array_map(fn($r)=>$r['subject'].': '.$r['average_score'].'% across '.$r['attempts'].' attempts. '.((float)$r['average_score']<70?'Review recommended.':'Continue practising.'),$rows));
                review_store('weakspot:'.$owner,$context,['attempts'=>0,'successes'=>1,'response'=>['text'=>$text,'success'=>true]],true);
            }
        } else throw new RuntimeException('Unknown action.',422);
        echo json_encode(['success'=>true]); exit;
    }
    if ($_SERVER['REQUEST_METHOD']!=='GET') throw new RuntimeException('Method not allowed.',405);
    $where='s.role=? AND s.owner_id=? AND v.hidden=0'; $params=[$role,$owner];
    if ($role==='student') $where.=" AND (s.feature<>'explanation' OR EXISTS(SELECT 1 FROM quiz_reviewer_settings release_settings JOIN quiz_idsubmissions submission ON submission.quiz_id=release_settings.quiz_id WHERE release_settings.quiz_id=s.quiz_id AND release_settings.reviewer_enabled=1 AND release_settings.answers_released=1 AND submission.student_id=s.owner_id AND submission.status IN ('submitted','graded')))";
    if (!empty($_GET['quiz'])) { $where.=' AND s.quiz_id=?'; $params[]=(int)$_GET['quiz']; }
    if (!empty($_GET['feature'])) { $where.=' AND s.feature=?'; $params[]=$_GET['feature']; }
    if (!empty($_GET['date'])) { $where.=' AND DATE(v.created_at)=?'; $params[]=$_GET['date']; }
    if (!empty($_GET['search'])) { $where.=' AND (q.title LIKE ? OR q.subject LIKE ? OR s.context_json LIKE ?)'; $term='%'.mb_substr($_GET['search'],0,100).'%'; array_push($params,$term,$term,$term); }
    $offset=max(0,(int)($_GET['offset']??0));
    $rows=pu_query($db,"SELECT v.id,v.version,v.created_at,v.response_json,s.feature,s.quiz_id,s.context_json,s.id set_id,s.scope,s.source_hash,q.title,q.subject,EXISTS(SELECT 1 FROM ai_review_sets newer WHERE newer.scope=s.scope AND newer.id>s.id) outdated FROM ai_review_versions v JOIN ai_review_sets s ON s.id=v.set_id LEFT JOIN quizzes q ON q.quiz_id=s.quiz_id WHERE $where ORDER BY v.id DESC LIMIT 51 OFFSET $offset",$params)->get_result()->fetch_all(MYSQLI_ASSOC);
    $more=count($rows)>50; $rows=array_slice($rows,0,50);
    $sources=[];
    foreach ($rows as &$row) {
        $sources[$row['scope']] ??= review_source_hash($db,review_identity($row['scope']));
        $row['outdated']=(int)($row['outdated'] || $row['source_hash']!==$sources[$row['scope']]);
        $response=json_decode($row['response_json'],true)?:[];
        $row['text']=$response['explanation']??$response['text']??'';
        $context=json_decode($row['context_json'],true);
        $row['question']=$context['question']??'';
        unset($row['response_json'],$row['context_json'],$row['source_hash'],$row['scope']);
    }
    echo json_encode(['success'=>true,'items'=>$rows,'more'=>$more],JSON_UNESCAPED_UNICODE);
} catch(Throwable $e) {
    $code=(int)$e->getCode(); $known=$code>=400&&$code<=599; http_response_code($known?$code:500);
    if (!$known) error_log('Review history: '.$e->getMessage());
    echo json_encode(['success'=>false,'message'=>$known?$e->getMessage():'Saved reviews are unavailable. Please retry.']);
}
