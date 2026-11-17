ALTER TABLE quizzes MODIFY status ENUM('draft','active','removed') NOT NULL DEFAULT 'draft';
