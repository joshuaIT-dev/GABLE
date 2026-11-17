<?php
$tab = strtolower((string)($_GET['tab'] ?? ''));
if (!preg_match('/^[a-f0-9]{64}$/', $tab)) { http_response_code(400); exit; }
session_start();
$instructor = $_SESSION['instructor'] ?? $_SESSION['instructor_id'] ?? null;
$generation = (int)($_SESSION['maintenance_generation'] ?? 0);
session_write_close();
session_name('GABLE_GAME');
session_start();
if (empty($_SESSION['game_tabs'][$tab]) && $instructor) {
    $_SESSION['game_tabs'][$tab] = ['instructor'=>(int)$instructor, 'maintenance_generation'=>$generation];
    $_SESSION['instructor'] = (int)$instructor;
    $_SESSION['maintenance_generation'] = $generation;
}
$context = $_SESSION['game_tabs'][$tab] ?? null;
if ($context) { require_once __DIR__.'/config.php'; $db=getConnection();$db->close(); }
header('Content-Type: application/json');
header('Cache-Control: no-store');
echo json_encode(['success'=>(bool)$context, 'instructor'=>$context['instructor']??null]);
