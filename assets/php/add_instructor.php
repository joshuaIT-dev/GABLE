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

    if (
        $instructor_number === '' ||
        $email === '' ||
        $first_name === '' ||
        $last_name === '' ||
        $college === '' ||
        $program === '' ||
        $password === ''
    ) {
        throw new Exception('Please complete all required fields.');
    }

    $rawAssignments = $input['assignments'] ?? null;
    if (!is_array($rawAssignments) || !$rawAssignments) {
        throw new Exception('Choose at least one subject and section.');
    }
    $assignments = [];
    foreach ($rawAssignments as $rawAssignment) {
        if (!is_array($rawAssignment)) {
            throw new Exception('Each subject must have its own section selections.');
        }
        $subject = trim((string)($rawAssignment['subject'] ?? ''));
        $rawSections = $rawAssignment['sections'] ?? null;
        if ($subject === '' || !is_array($rawSections)) {
            throw new Exception('Choose a subject and its section selections.');
        }
        $sections = [];
        foreach ($rawSections as $rawSection) {
            $section = trim((string)$rawSection);
            if ($section !== '') $sections[] = $section;
        }
        if (!$sections) {
            throw new Exception('Choose at least one section for each subject.');
        }
        $assignments[] = [
            'subject' => $subject,
            'sections' => $sections
        ];
    }

    $programCheck=$conn->prepare('SELECT student_id FROM student WHERE college=? AND program=? LIMIT 1');
    $programCheck->bind_param('ss',$college,$program);$programCheck->execute();
    if(!$programCheck->get_result()->num_rows)throw new Exception('Choose a program listed under the selected college.');
    $programCheck->close();
    $yearCheck = $conn->prepare('SELECT DISTINCT year_level FROM student WHERE college=? AND program=? AND year_level IS NOT NULL');
    $yearCheck->bind_param('ss', $college, $program);
    $yearCheck->execute();
    $validSections = [];
    foreach ($yearCheck->get_result()->fetch_all(MYSQLI_ASSOC) as $row) {
        foreach (range('A', 'Z') as $block) {
            $validSections[] = trim($program) . ' ' . $row['year_level'] . $block;
        }
    }
    $yearCheck->close();
    $subjectCheck = $conn->prepare("
        SELECT ta.assignment_id
        FROM teaching_assignments ta
        JOIN student s
          ON CONVERT(TRIM(ta.section) USING utf8mb4) COLLATE utf8mb4_unicode_ci =
             CONVERT(CONCAT(TRIM(s.program), ' ', s.year_level, TRIM(s.block)) USING utf8mb4) COLLATE utf8mb4_unicode_ci
        WHERE s.college = ? AND s.program = ? AND ta.subject_name = ?
        UNION
        SELECT q.quiz_id
        FROM quizzes q
        JOIN student s
          ON CONVERT(TRIM(q.section) USING utf8mb4) COLLATE utf8mb4_unicode_ci =
             CONVERT(CONCAT(TRIM(s.program), ' ', s.year_level, TRIM(s.block)) USING utf8mb4) COLLATE utf8mb4_unicode_ci
        WHERE s.college = ? AND s.program = ? AND q.subject = ?
        LIMIT 1
    ");
    foreach ($assignments as $assignment) {
        $subject = $assignment['subject'];
        $subjectCheck->bind_param(
            'ssssss',
            $college,
            $program,
            $subject,
            $college,
            $program,
            $subject
        );
        $subjectCheck->execute();
        if (!$subjectCheck->get_result()->num_rows) {
            throw new Exception('Choose a subject listed under the selected program.');
        }
        foreach ($assignment['sections'] as $section) {
            if (!in_array($section, $validSections, true)) {
                throw new Exception('Choose a section from A to Z for the selected program.');
            }
        }
    }
    $subjectCheck->close();


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


    // Save the account and its initial subject-section assignments together.
    $conn->begin_transaction();
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


    $new_id = $conn->insert_id;
    $stmt->close();
    $assignment = $conn->prepare("INSERT INTO teaching_assignments (instructor_id, subject_name, section, assignment_type) VALUES (?, ?, ?, 'Lecture')");
    foreach ($assignments as $instructorAssignment) {
        foreach ($instructorAssignment['sections'] as $section) {
            $subject = $instructorAssignment['subject'];
            $assignment->bind_param('iss', $new_id, $subject, $section);
            if (!$assignment->execute()) throw new Exception($assignment->error);
        }
    }
    $assignment->close();
    $conn->commit();
    $conn->close();


    echo json_encode([
        'success' => true,
        'message' =>
            'Instructor added successfully.',
        'instructor_id' =>
            $new_id
    ]);


} catch (Throwable $e) {
    if (isset($conn) && $conn instanceof mysqli && $conn->thread_id) $conn->rollback();
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' =>
            $e->getMessage()
    ]);
}