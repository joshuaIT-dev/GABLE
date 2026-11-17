<?php

require_once 'config.php';

header('Content-Type: application/json');

try {

    $conn = getConnection();

    $input = json_decode(file_get_contents('php://input'), true);

    $first_name  = trim($input['first_name'] ?? '');
    $last_name   = trim($input['last_name'] ?? '');
    $student_num = trim($input['student_number'] ?? '');
    $email       = trim($input['institutional_email'] ?? '');
    $college     = trim($input['college'] ?? '');
    $program     = trim($input['program'] ?? '');
    $year_level  = (int)($input['year_level'] ?? 1);
    $block       = trim($input['block'] ?? '');
    $password    = $input['password'] ?? '';


    if(!is_string($password)||strlen($password)<8||strlen($password)>72)throw new RuntimeException('Use a password of 8–72 characters.',422);
    $password=password_hash($password,PASSWORD_DEFAULT);
    /* REQUIRED FIELDS */

    if (
        $first_name === '' ||
        $last_name === '' ||
        $student_num === '' ||
        $college === '' ||
        $program === '' ||
        $block === ''
    ) {

        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Please complete all required fields.'
        ]);

        exit;
    }


    /* CHECK IF STUDENT NUMBER ALREADY EXISTS */

    $check = $conn->prepare("
        SELECT student_id
        FROM student
        WHERE student_number = ?
        LIMIT 1
    ");

   $check->bind_param(
    "s",
    $student_num
);

    $check->execute();

    $existing = $check->get_result();

    if ($existing->num_rows > 0) {

        http_response_code(409);

        echo json_encode([
            'success' => false,
            'message' => 'Student number already exists.'
        ]);

        $check->close();
        $conn->close();

        exit;
    }

    $check->close();


    /* INSERT STUDENT */

    $stmt = $conn->prepare("
        INSERT INTO student
        (
            student_number,
            institutional_email,
            first_name,
            last_name,
            college,
            program,
            year_level,
            block,
            password
        )
        VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    if (!$stmt) {
        throw new Exception($conn->error);
    }


    $stmt->bind_param(
    "ssssssiss",
        $student_num,
        $email,
        $first_name,
        $last_name,
        $college,
        $program,
        $year_level,
        $block,
        $password
    );


    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }


    $newStudentId = $stmt->insert_id;


    echo json_encode([
        'success' => true,
        'message' => 'Student added successfully.',
        'student_id' => $newStudentId
    ]);


    $stmt->close();
    $conn->close();


} catch (Throwable $e) {

    $known=$e instanceof RuntimeException && $e->getCode()===422;
    http_response_code($known?422:500);
    if (!$known) error_log('Add student: '.$e->getMessage());
    echo json_encode(['success'=>false,'message'=>$known?$e->getMessage():'Failed to add student.']);
}