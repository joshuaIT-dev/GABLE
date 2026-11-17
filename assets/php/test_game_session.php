<?php
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}

session_start();

header('Content-Type: application/json');

echo json_encode([
    'success' => true,
    'session' => $_SESSION,
    'instructor' => $_SESSION['instructor'] ?? null
]);