UPDATE teaching_assignments
SET section = CONCAT(
    'BSIT ',
    TRIM(SUBSTRING(TRIM(section), CHAR_LENGTH('BS in IT') + 1))
)
WHERE LOWER(TRIM(section)) LIKE 'bs in it%'
  AND TRIM(SUBSTRING(TRIM(section), CHAR_LENGTH('BS in IT') + 1)) <> '';

UPDATE quizzes
SET section = CONCAT(
    'BSIT ',
    TRIM(SUBSTRING(TRIM(section), CHAR_LENGTH('BS in IT') + 1))
)
WHERE LOWER(TRIM(section)) LIKE 'bs in it%'
  AND TRIM(SUBSTRING(TRIM(section), CHAR_LENGTH('BS in IT') + 1)) <> '';
