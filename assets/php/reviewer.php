<?php
session_start(); header('Content-Type: application/json'); header('Cache-Control: no-store');
require_once __DIR__.'/config.php'; require_once __DIR__.'/review_history_service.php';
try {
    $db=getConnection(); $quiz=(int)($_GET['quiz']??0);
    if ($quiz<=0) throw new RuntimeException('Choose a quiz.',422);
    if (($_GET['role']??'student')==='instructor') {
        $owner=(int)($_SESSION['instructor']??0);
        if (!$owner) throw new RuntimeException('Please sign in.',401);
        if (!pu_row($db,'SELECT quiz_id FROM quizzes WHERE quiz_id=? AND instructor_id=?',[$quiz,$owner])) throw new RuntimeException('Quiz not found.',404);
        if ($_SERVER['REQUEST_METHOD']==='POST') {
            if (stripos($_SERVER['CONTENT_TYPE']??'','application/json')!==0) throw new RuntimeException('JSON required.',415);
            $input=json_decode(file_get_contents('php://input'),true)?:[];
            if (!is_bool($input['reviewer_enabled']??null)||!is_bool($input['answers_released']??null)) throw new RuntimeException('Choose valid release settings.',422);
            pu_query($db,'INSERT INTO quiz_reviewer_settings(quiz_id,reviewer_enabled,answers_released) VALUES (?,?,?) ON DUPLICATE KEY UPDATE reviewer_enabled=VALUES(reviewer_enabled),answers_released=VALUES(answers_released)',[$quiz,(int)$input['reviewer_enabled'],(int)($input['reviewer_enabled']&&$input['answers_released'])]);
        } elseif ($_SERVER['REQUEST_METHOD']!=='GET') throw new RuntimeException('Method not allowed.',405);
        $settings=pu_row($db,'SELECT reviewer_enabled,answers_released FROM quiz_reviewer_settings WHERE quiz_id=?',[$quiz])?:['reviewer_enabled'=>0,'answers_released'=>0];
        echo json_encode(['success'=>true,'settings'=>$settings]);
    } else {
        if ($_SERVER['REQUEST_METHOD']!=='GET') throw new RuntimeException('Method not allowed.',405);
        $owner=(int)($_SESSION['student']??$_SESSION['student_id']??0);
        if (!$owner) throw new RuntimeException('Please sign in.',401);
        echo json_encode(['success'=>true,'reviewer'=>reviewer_data($db,$owner,$quiz)],JSON_UNESCAPED_UNICODE);
    }
} catch(Throwable $e) {
    $code=(int)$e->getCode(); $known=$code>=400&&$code<=599; http_response_code($known?$code:500);
    if (!$known) error_log('Reviewer export: '.$e->getMessage());
    echo json_encode(['success'=>false,'message'=>$known?$e->getMessage():'Reviewer unavailable. Please retry.']);
}
