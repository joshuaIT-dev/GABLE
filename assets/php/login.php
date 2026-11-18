<?php

session_start();

require 'config.php';

if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);exit;}
$conn = getConnection();
require_once __DIR__.'/login_security.php';
login_limit($conn,'ip:'.($_SERVER['REMOTE_ADDR']??'unknown'),60,60);
login_limit($conn,'account:'.(string)($_POST['role']??'').':'.(string)($_POST['id']??''),10,900);

function accountPasswordMatches($password, $stored) {
    if (!is_string($password) || !is_string($stored) || $stored === '') return false;
    return password_get_info($stored)['algoName'] !== 'unknown' && password_verify($password,$stored);
}

$role = $_POST['role'] ?? '';
$id = $_POST['id'] ?? '';
$password = $_POST['password'] ?? '';
$maintenance=maintenance_state($conn);
if((int)$maintenance['enabled'] && $role!=='admin'){
 echo 'GABLE is under maintenance. Login is temporarily unavailable. Please try again later.';exit;
}


if ($role == "student") {

    $stmt = $conn->prepare("
        SELECT *
        FROM student
        WHERE student_number = ?
        LIMIT 1
    ");

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows == 0) {
        echo "Invalid Student ID";
        exit;
    }

 $row = $result->fetch_assoc();

if ($row['status'] !== 'Active') {
    echo "Your account has been deactivated.";
    exit;
}

if (!accountPasswordMatches($password, $row['password'])) {
    echo "Incorrect Password";
    exit;
}

login_clear($conn,'account:'.$role.':'.$id);
session_regenerate_id(true);
    $_SESSION['maintenance_generation']=(int)$maintenance['generation'];
    $_SESSION['student'] = $row['student_id'];

    echo "success";
    exit;
}

elseif ($role == "admin") {

    $stmt = $conn->prepare("
        SELECT *
        FROM admin
        WHERE admin_number = ?
        LIMIT 1
    ");

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows == 0) {
        echo "Invalid Admin ID";
        exit;
    }

    $row = $result->fetch_assoc();

    if (!accountPasswordMatches($password, $row['password'])) {
        echo "Incorrect Password";
        exit;
    }

    login_clear($conn,'account:'.$role.':'.$id);
session_regenerate_id(true);
    $_SESSION['maintenance_generation']=(int)$maintenance['generation'];
    $_SESSION['admin'] = $row['admin_id'];

    echo "success";
    exit;
}

elseif ($role == "instructor") {

    $stmt = $conn->prepare("
        SELECT *
        FROM instructor
        WHERE instructor_number = ?
        LIMIT 1
    ");

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows == 0) {
        echo "Invalid Instructor ID";
        exit;
    }

 $row = $result->fetch_assoc();

if ($row['status'] !== 'Active') {
    echo "Your account has been deactivated.";
    exit;
}

if (!accountPasswordMatches($password, $row['password'])) {
    echo "Incorrect Password";
    exit;

    }

    login_clear($conn,'account:'.$role.':'.$id);
session_regenerate_id(true);
    $_SESSION['maintenance_generation']=(int)$maintenance['generation'];
    $_SESSION['instructor'] = $row['instructor_id'];

    echo "success";
    exit;
}

echo "Invalid Login";
