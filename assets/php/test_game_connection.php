<?php
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}

header('Content-Type: application/json');

require_once 'config.php';

try {

    $conn = getConnection();

    $result = $conn->query("SELECT DATABASE() AS db_name");

    $row = $result->fetch_assoc();

    echo json_encode([
        'success' => true,
        'message' => 'PHP can connect to MySQL.',
        'database' => $row['db_name']
    ]);

    $conn->close();

} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}