<?php
/*
|--------------------------------------------------------------------------
| platform_status.php
|--------------------------------------------------------------------------
| Public, read-only status used by the Student / Instructor pages so they
| can show a maintenance screen or hide disabled features.
|
| This is ONLY for the user interface. Every protected action is also
| enforced on the server in its own endpoint.
|--------------------------------------------------------------------------
*/

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/platform_guard.php';

try {
    $conn = getConnection();
    $settings = platform_get_settings($conn);
    $maintenance=maintenance_state($conn);
    $signedIn=!empty($_SESSION['student'])||!empty($_SESSION['student_id'])||!empty($_SESSION['instructor'])||!empty($_SESSION['admin']);
    $affected=$signedIn && empty($_SESSION['admin']) && (int)($_SESSION['maintenance_generation']??0)<(int)$maintenance['generation'];
    $logout=maintenance_session_due($maintenance,$_SESSION);
    if($logout)maintenance_destroy_session();
    $conn->close();

    echo json_encode([
        'success'               => true,
        'logout'=>$logout, 'signed_in'=>$signedIn, 'deadline'=>$affected?(int)$maintenance['deadline']:0, 'server_time'=>(int)$maintenance['server_time'],
        'maintenance'           => (bool)$settings['platform_maintenance_mode_enabled'],
        'grade_boost_enabled'   => (bool)$settings['platform_grade_boost_enabled'],
        'battle_royale_enabled' => (bool)$settings['platform_battle_royale_enabled'],
        'message'               => $settings['platform_maintenance_mode_enabled']
            ? platform_maintenance_message()
            : ''
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Could not read platform status.'
    ]);
}
