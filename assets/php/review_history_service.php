<?php
require_once __DIR__.'/powerup_service.php';
function review_identity(string $scope): array {
    $parts=explode(':',$scope);
    return ['role'=>$parts[0]==='class-insight'?'instructor':'student','owner'=>(int)($parts[1]??0),'feature'=>$parts[0],'quiz'=>(int)($parts[2]??0)];
}
function review_source_data(mysqli $db,array $who): array {
    $params=[$who['owner']];
    $where=$who['role']==='instructor'?'q.instructor_id=?':'s.student_id=?';
    if ($who['quiz']) { $where.=' AND q.quiz_id=?'; $params[]=$who['quiz']; }
    $rows=pu_query($db,"SELECT q.quiz_id,q.title,q.subject,q.questions,s.submission_id,s.answers,s.status,s.score FROM quizzes q LEFT JOIN quiz_idsubmissions s ON s.quiz_id=q.quiz_id WHERE $where ORDER BY q.quiz_id,s.submission_id",$params)->get_result()->fetch_all(MYSQLI_ASSOC);
    return $rows;
}
function review_source_hash(mysqli $db,array $who): string {
    return hash('sha256',json_encode(review_source_data($db,$who),JSON_THROW_ON_ERROR));
}
function review_store(string $scope,string $context,array $state,bool $version=false): array {
    $db=getConnection(); $who=review_identity($scope); $hash=hash('sha256',$context);
    pu_query($db,'INSERT INTO ai_review_sets(scope,owner_id,role,feature,quiz_id,fingerprint,source_hash,context_json,state_json) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE state_json=VALUES(state_json)',[$scope,$who['owner'],$who['role'],$who['feature'],$who['quiz'],$hash,review_source_hash($db,$who),$context,json_encode($state,JSON_THROW_ON_ERROR)]);
    $set=pu_row($db,'SELECT id FROM ai_review_sets WHERE scope=? AND fingerprint=?',[$scope,$hash]);
    if ($version && isset($state['response'])) pu_query($db,'INSERT IGNORE INTO ai_review_versions(set_id,version,response_json) VALUES (?,?,?)',[$set['id'],max(1,(int)($state['successes']??$state['attempts'])),json_encode($state['response'],JSON_THROW_ON_ERROR)]);
    return $set;
}
function review_restore(string $scope,string $context): ?array {
    $row=pu_row(getConnection(),'SELECT state_json FROM ai_review_sets WHERE scope=? AND fingerprint=?',[$scope,hash('sha256',$context)]);
    return $row ? json_decode($row['state_json'],true) : null;
}
function review_previous(string $scope,string $context): ?array {
    $row=pu_row(getConnection(),"SELECT state_json FROM ai_review_sets WHERE scope=? AND fingerprint<>? AND JSON_EXTRACT(state_json,'$.response') IS NOT NULL ORDER BY id DESC LIMIT 1",[$scope,hash('sha256',$context)]);
    return $row?json_decode($row['state_json'],true):null;
}
function reviewer_data(mysqli $db,int $student,int $quiz): array {
    $row=pu_row($db,"SELECT s.*,p.snapshot_json,r.reviewer_enabled,r.answers_released FROM quiz_idsubmissions s JOIN quizzes q ON q.quiz_id=s.quiz_id LEFT JOIN quiz_submission_snapshots p ON p.submission_id=s.submission_id LEFT JOIN quiz_reviewer_settings r ON r.quiz_id=s.quiz_id WHERE s.student_id=? AND s.quiz_id=? ORDER BY s.submission_id DESC LIMIT 1",[$student,$quiz]);
    if (!$row) throw new RuntimeException('Submission or quiz not found.',404);
    if (!in_array($row['status'],['submitted','graded','pending_review'],true)) throw new RuntimeException('Submit this quiz before exporting.',409);
    if (!(int)$row['reviewer_enabled']) throw new RuntimeException('Your instructor has not enabled reviewer exports for this quiz.',403);
    if (!$row['snapshot_json']) throw new RuntimeException('This older submission has no original question snapshot. A reliable reviewer cannot be exported.',409);
    $snapshot=json_decode($row['snapshot_json'],true,512,JSON_THROW_ON_ERROR);
    $answers=json_decode($row['answers'],true)?:[];
    $released=(bool)$row['answers_released'] && $row['status']!=='pending_review';
    $items=[];
    foreach ($snapshot['questions'] as $i=>$q) {
        $a=$answers[$i]??[]; $choices=$q['choices']??$q['opts']??[]; $id=($q['type']??'mc')==='id'; $value=$a['answer']??null;
        $chosen=$value===null || $value===''?'No answer saved':($id?(string)$value:($choices[$value]??'No answer saved'));
        $item=['question'=>$q['text']??$q['q']??'', 'choices'=>$choices,'student_answer'=>$chosen,'grading'=>($a['correct']??null)===null?'Awaiting grading':(($a['correct']??false)?'Correct':'Incorrect')];
        if ($released) {
            $expected=$id?($q['correctAnswer']??$q['correct_answer']??$q['expectedAnswer']??null):($choices[(int)($q['correct']??-1)]??null);
            $item['correct_answer']=$expected;
            $context=['subject'=>$snapshot['subject'],'question'=>$a['question']??$q['text']??$q['q']??'','student_answer'=>$chosen,'expected_answer'=>$expected];
            $saved=review_restore('explanation:'.$student.':'.$quiz.':'.$i,json_encode($context));
            if ($saved) $item['explanation']=$saved['response']['explanation']??'';
        }
        $items[]=$item;
    }
    unset($snapshot['questions']);
    return $snapshot+['questions'=>$items,'submitted_at'=>$row['submitted_at'],'status'=>$row['status'],'answers_released'=>$released];
}
