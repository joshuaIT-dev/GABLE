ALTER TABLE admin
    MODIFY college VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL;

UPDATE student
SET college = 'College of Information Technology & Computer Studies'
WHERE TRIM(college) = 'College of Information Technology';

UPDATE instructor
SET college = 'College of Information Technology & Computer Studies'
WHERE TRIM(college) = 'College of Information Technology';

UPDATE admin
SET college = 'College of Information Technology & Computer Studies'
WHERE TRIM(college) = 'College of Information Technology';

UPDATE student
SET program = 'BSIT'
WHERE TRIM(program) = 'BS in IT';

UPDATE instructor
SET program = 'BSIT'
WHERE TRIM(program) = 'BS in IT';
