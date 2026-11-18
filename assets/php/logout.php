<?php
session_start();
header('Content-Type: application/json');
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['success'=>false]); exit; }
$role = $_POST['role'] ?? '';
if (in_array($role, ['student','instructor','admin'], true)) {
    unset($_SESSION[$role], $_SESSION[$role.'_id']);
} else {
    $_SESSION = [];
    session_destroy();
}
echo json_encode(['success'=>true]);
