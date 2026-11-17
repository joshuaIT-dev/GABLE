<?php

require_once 'config.php';

header('Content-Type: application/json');

try {
    $conn = getConnection();

    $input = json_decode(
        file_get_contents('php://input'),
        true
    );

    if (!$input) {
        throw new Exception(
            'Invalid request data.'
        );
    }


    $instructor_number =
        trim($input['instructor_number'] ?? '');

    $email =
        trim($input['email'] ?? '');

    $first_name =
        trim($input['first_name'] ?? '');

    $last_name =
        trim($input['last_name'] ?? '');

    $college =
        trim($input['college'] ?? '');

    $program =
        trim($input['program'] ?? '');

    $password =
        $input['password'] ?? '';

    $teaching_exp =
        (int)($input['teaching_exp'] ?? 0);


    // REQUIRED FIELDS
    if (
        $instructor_number === '' ||
        $email === '' ||
        $first_name === '' ||
        $last_name === '' ||
        $college === '' ||
        $program === '' ||
        $password === ''
    ) {

        throw new Exception(
            'Please complete all required fields.'
        );
    }


    // EMAIL
    if (!filter_var(
        $email,
        FILTER_VALIDATE_EMAIL
    )) {

        throw new Exception(
            'Please enter a valid email address.'
        );
    }


    // EXP
    if ($teaching_exp < 0) {

        throw new Exception(
            'Teaching EXP cannot be negative.'
        );
    }





    // CHECK INSTRUCTOR NUMBER
    $check = $conn->prepare("
        SELECT instructor_id
        FROM instructor
        WHERE instructor_number = ?
        LIMIT 1
    ");

    if (!$check) {
        throw new Exception(
            $conn->error
        );
    }


    $check->bind_param(
        "s",
        $instructor_number
    );

    $check->execute();

    $check->store_result();


    if ($check->num_rows > 0) {

        $check->close();
        $conn->close();

        throw new Exception(
            'Instructor ID already exists.'
        );
    }


    $check->close();


    // CHECK EMAIL
    $check = $conn->prepare("
        SELECT instructor_id
        FROM instructor
        WHERE institutional_email = ?
        LIMIT 1
    ");

    if (!$check) {
        throw new Exception(
            $conn->error
        );
    }


    $check->bind_param(
        "s",
        $email
    );

    $check->execute();

    $check->store_result();


    if ($check->num_rows > 0) {

        $check->close();
        $conn->close();

        throw new Exception(
            'Institutional email already exists.'
        );
    }


    $check->close();


    // HASH PASSWORD
    $hashed_password =
        password_hash(
            $password,
            PASSWORD_DEFAULT
        );


    // INSERT
    $stmt = $conn->prepare("
        INSERT INTO instructor (
            instructor_number,
            institutional_email,
            first_name,
            last_name,
            college,
            program,
            password,
            teaching_exp
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");


    if (!$stmt) {
        throw new Exception(
            $conn->error
        );
    }


    $stmt->bind_param(
        "sssssssi",

        $instructor_number,
        $email,
        $first_name,
        $last_name,
        $college,
        $program,
        $hashed_password,
        $teaching_exp
    );


    if (!$stmt->execute()) {

        throw new Exception(
            $stmt->error
        );
    }


    $new_id =
        $conn->insert_id;


    $stmt->close();
    $conn->close();


    echo json_encode([
        'success' => true,
        'message' =>
            'Instructor added successfully.',
        'instructor_id' =>
            $new_id
    ]);


} catch (Throwable $e) {

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' =>
            $e->getMessage()
    ]);
}