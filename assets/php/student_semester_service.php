<?php
require_once __DIR__.'/powerup_service.php';

function semester_current(mysqli $db): array {
    return pu_row($db,'SELECT * FROM current_xp_semester');
}

function semester_snapshot(mysqli $db): array {
    $students=pu_query($db,"SELECT s.student_id,s.student_number,CONCAT_WS(' ',s.first_name,s.last_name) name,
        COALESCE(NULLIF(TRIM(s.college),''),'Unspecified college') college,s.program,s.year_level,s.block,s.status,
        x.earned_xp,x.bonus_xp,x.spent_xp,x.semester_xp,x.xp,
        COALESCE(p.lifetime_xp,0) level_progress,COALESCE(p.streak,0) streak,p.last_activity
        FROM student s JOIN current_student_xp x ON x.student_id=s.student_id
        LEFT JOIN student_reward_progress p ON p.student_id=s.student_id
        ORDER BY x.semester_xp DESC,s.last_name,s.first_name,s.student_id")->get_result()->fetch_all(MYSQLI_ASSOC);
    $grants=pu_query($db,'SELECT * FROM student_powerup_grants ORDER BY student_id,level')->get_result()->fetch_all(MYSQLI_ASSOC);
    $cutoffs=pu_row($db,'SELECT (SELECT COALESCE(MAX(submission_id),0) FROM quiz_idsubmissions) submission_cutoff,
        (SELECT COALESCE(MAX(redemption_id),0) FROM grade_boost_redemptions) redemption_cutoff,
        (SELECT COALESCE(MAX(use_id),0) FROM student_powerup_uses) use_cutoff');
    $colleges=pu_query($db,"SELECT TRIM(college) college FROM student WHERE TRIM(COALESCE(college,''))<>'' UNION SELECT TRIM(college) FROM instructor WHERE TRIM(COALESCE(college,''))<>'' ORDER BY college")->get_result()->fetch_all(MYSQLI_ASSOC);
    return ['semester'=>semester_current($db),'students'=>$students,'colleges'=>$colleges,'grants'=>$grants,'cutoffs'=>$cutoffs];
}

function semester_hash(array $snapshot): string {
    return hash('sha256',json_encode($snapshot,JSON_THROW_ON_ERROR));
}

function semester_lock_students(mysqli $db): void {
    // Every XP mutation locks its student's row; hold the same locks for an atomic rollover.
    pu_query($db,'SELECT student_id FROM student ORDER BY student_id FOR UPDATE')->get_result()->fetch_all();
    pu_query($db,'SELECT semester_id FROM student_xp_semesters ORDER BY semester_id FOR UPDATE')->get_result()->fetch_all();
}

function semester_reset(mysqli $db,int $exportId,int $admin,string $label): void {
    $label=trim($label);
    if ($label==='' || mb_strlen($label)>100) throw new RuntimeException('Enter a semester name of 1–100 characters.',422);
    $export=pu_row($db,'SELECT * FROM student_xp_exports WHERE export_id=? AND admin_id=? FOR UPDATE',[$exportId,$admin]);
    if (!$export || $export['used_at']) throw new RuntimeException('Download a fresh semester export before resetting.',409);
    $snapshot=semester_snapshot($db);
    if ((int)$export['semester_id']!==(int)$snapshot['semester']['semester_id'] || !hash_equals($export['snapshot_hash'],semester_hash($snapshot))) {
        throw new RuntimeException('XP or student records changed after export. Download a fresh export before resetting.',409);
    }
    $active=pu_row($db,'SELECT COUNT(*) n FROM student_quiz_attempts a LEFT JOIN quiz_idsubmissions q ON q.student_id=a.student_id AND q.quiz_id=a.quiz_id WHERE q.submission_id IS NULL AND a.deadline>UNIX_TIMESTAMP()');
    if ((int)$active['n']>0) throw new RuntimeException('Students have active quiz attempts. Wait for them to finish, then export again.',409);
    $bounds=$snapshot['cutoffs'];
    pu_query($db,'UPDATE student_xp_semesters SET closed_at=NOW(),closed_by=? WHERE semester_id=?',[$admin,$export['semester_id']]);
    pu_query($db,'INSERT INTO student_xp_semesters(label,scheduled_end,submission_cutoff,redemption_cutoff,use_cutoff,opened_by) VALUES (?,DATE_ADD(CURDATE(),INTERVAL 6 MONTH),?,?,?,?)',[$label,$bounds['submission_cutoff'],$bounds['redemption_cutoff'],$bounds['use_cutoff'],$admin]);
    pu_query($db,'DELETE FROM student_powerup_grants');
    pu_query($db,'DELETE FROM student_reward_progress');
    pu_query($db,'UPDATE student_xp_exports SET used_at=NOW() WHERE export_id=?',[$exportId]);
}

function semester_report_html(array $snapshot,int $exportId,string $created): string {
    $e=fn($value)=>htmlspecialchars((string)$value,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
    $table=function(array $students) use($e): string {
        $html='<table><thead><tr><th>Rank</th><th>Student / ID</th><th>College / Program</th><th>Semester XP</th><th>Available XP</th></tr></thead><tbody>';
        foreach ($students as $i=>$s) $html.='<tr><td>'.($i+1).'</td><td><strong>'.$e($s['name']).'</strong><br>'.$e($s['student_number']).'</td><td>'.$e($s['college']).'<br>'.$e($s['program'].' '.$s['year_level'].$s['block']).'</td><td>'.number_format((int)$s['semester_xp']).'</td><td>'.number_format((int)$s['xp']).'</td></tr>';
        return $html.($students?'':'<tr><td colspan="5">No students recorded.</td></tr>').'</tbody></table>';
    };
    $students=$snapshot['students']; $colleges=[];
    foreach ($snapshot['colleges'] ?? [] as $college) $colleges[$college['college']]=[];
    foreach ($students as $student) $colleges[$student['college']][]=$student;
    ksort($colleges,SORT_NATURAL|SORT_FLAG_CASE);
    $semester=$snapshot['semester'];
    $html='<!doctype html><html lang="en"><meta charset="utf-8"><title>GABLE semester XP report</title><style>body{font:15px/1.5 Arial,sans-serif;color:#172b43;max-width:1050px;margin:40px auto;padding:0 24px}header{border-bottom:3px solid #172b43;padding-bottom:20px}h1{font-size:28px;margin:8px 0}h2{font-size:21px;margin-top:32px}p{color:#45566b}table{width:100%;border-collapse:collapse;margin:16px 0 28px;font-size:13px}th{text-align:left;background:#e9eef4}th,td{padding:10px;border:1px solid #cbd5e1;vertical-align:top}td:nth-last-child(-n+2){text-align:right;white-space:nowrap}thead{display:table-header-group}tr{break-inside:avoid}h2{break-after:avoid}.college{break-before:page}@media print{body{margin:0;padding:0;font-size:11pt}@page{size:A4 landscape;margin:16mm}}</style><header><strong>GABLE · STUDENT XP ARCHIVE</strong><h1>'.$e($semester['label']).'</h1><p>Started: '.$e($semester['started_at']).' · Scheduled end: '.$e($semester['scheduled_end']).'<br>Export #'.$exportId.' · '.$e($created).' PHT</p></header><p>Ranks use earned semester XP including reward bonuses, before spending. Ties are ordered by last name, first name, then student ID. All student accounts are included. Each list shows up to 10 students; colleges with fewer students show everyone.</p><p>Students: '.count($students).' · Total semester XP: '.number_format(array_sum(array_column($students,'semester_xp'))).'</p><h2>University top 10</h2>'.$table(array_slice($students,0,10));
    foreach($colleges as $college=>$rows) $html.='<section class="college"><h2>'.$e($college).' · Top 10</h2>'.$table(array_slice($rows,0,10)).'</section>';
    $html.='<section class="college"><h2>Complete student XP register</h2><p>This register preserves every student balance before reset. Quiz grades and historical awards remain in GABLE. Semester reset restarts XP, levels, frames, power-ups and streaks; instructor XP is unaffected.</p>'.$table($students).'</section></html>';
    return $html;
}
