<?php
require getenv('GABLE_PRIVATE_CONFIG') ?: dirname(__DIR__,4).'/gable-private/config.php';
require_once __DIR__.'/auth_guard.php';
date_default_timezone_set('Asia/Manila');

 

function getConnection($withDb = true) {
    $conn = $withDb
        ? new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME)
        : new mysqli(DB_HOST, DB_USER, DB_PASS);
 
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }
 
    $conn->set_charset('utf8mb4');
    $conn->query("SET time_zone='+08:00'");
    if($withDb){auth_enforce($conn);require_once __DIR__.'/maintenance_service.php';maintenance_enforce($conn);}
    return $conn;
}

