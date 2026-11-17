<?php
session_start();
header('Content-Type: application/json');header('Cache-Control: no-store');
if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);echo json_encode(['success'=>false]);exit;}
$_SESSION=[];session_destroy();echo json_encode(['success'=>true]);
