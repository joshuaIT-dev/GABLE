-- Complete GABLE schema snapshot.
-- Run after selecting the target database; database name is configured privately by the application.
-- Includes the baseline schema and all migrations in filename order; no application records are included.

-- Source: 00000000_baseline.sql
SET FOREIGN_KEY_CHECKS=0;
CREATE TABLE IF NOT EXISTS `admin` (
  `admin_id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_number` int(11) DEFAULT NULL,
  `institutional_email` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `first_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `middle_initial` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `college` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`admin_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `ai_review_sets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `scope` varchar(190) NOT NULL,
  `owner_id` int(11) NOT NULL,
  `role` varchar(16) NOT NULL,
  `feature` varchar(32) NOT NULL,
  `quiz_id` int(11) NOT NULL DEFAULT 0,
  `fingerprint` char(64) NOT NULL,
  `context_json` longtext NOT NULL,
  `state_json` longtext NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `source_hash` char(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `context_key` (`scope`,`fingerprint`),
  KEY `owner_key` (`role`,`owner_id`)
) ENGINE=InnoDB AUTO_INCREMENT=218 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS `ai_review_versions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `set_id` bigint(20) unsigned NOT NULL,
  `version` int(11) NOT NULL,
  `response_json` longtext NOT NULL,
  `hidden` tinyint(4) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `version_key` (`set_id`,`version`)
) ENGINE=InnoDB AUTO_INCREMENT=104 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS `announcements` (
  `announcement_id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `target` enum('all','students','instructors') NOT NULL,
  `priority` enum('normal','important','urgent') NOT NULL DEFAULT 'normal',
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`announcement_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `flags` (
  `flag_id` int(11) NOT NULL AUTO_INCREMENT,
  `quiz_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `question_index` int(11) NOT NULL,
  `reason` varchar(500) NOT NULL,
  `status` enum('pending','resolved') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolved_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`flag_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `game_questions` (
  `question_id` int(11) NOT NULL AUTO_INCREMENT,
  `instructor_id` int(11) NOT NULL,
  `section` varchar(100) NOT NULL,
  `topic` varchar(150) NOT NULL,
  `game_mode` varchar(50) NOT NULL,
  `question_text` text DEFAULT NULL,
  `answer` varchar(255) NOT NULL,
  `option_a` varchar(255) DEFAULT NULL,
  `option_b` varchar(255) DEFAULT NULL,
  `option_c` varchar(255) DEFAULT NULL,
  `option_d` varchar(255) DEFAULT NULL,
  `hint` text DEFAULT NULL,
  `jumbled_word` varchar(255) DEFAULT NULL,
  `crossword_row` int(11) DEFAULT NULL,
  `crossword_col` int(11) DEFAULT NULL,
  `crossword_direction` enum('across','down') DEFAULT NULL,
  `crossword_number` int(11) DEFAULT NULL,
  `points` int(11) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`question_id`),
  KEY `idx_game_instructor` (`instructor_id`),
  KEY `idx_game_section` (`section`),
  KEY `idx_game_topic` (`topic`),
  KEY `idx_game_mode` (`game_mode`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `grade_boost_redemptions` (
  `redemption_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `submission_id` int(11) NOT NULL,
  `quiz_id` int(11) NOT NULL,
  `xp_cost` int(11) NOT NULL DEFAULT 350,
  `score_before` decimal(5,2) NOT NULL DEFAULT 0.00,
  `score_after` decimal(5,2) NOT NULL DEFAULT 0.00,
  `redeemed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`redemption_id`),
  UNIQUE KEY `uq_boost_submission` (`submission_id`),
  KEY `idx_boost_student` (`student_id`),
  KEY `idx_boost_quiz` (`quiz_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `instructor` (
  `instructor_id` int(11) NOT NULL AUTO_INCREMENT,
  `instructor_number` int(11) DEFAULT NULL,
  `institutional_email` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `first_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `college` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `program` varchar(100) DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `teaching_exp` int(11) DEFAULT 0,
  `grade` varchar(5) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'Active',
  `course_alignment` tinyint(3) unsigned DEFAULT NULL,
  `evaluation_updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`instructor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `instructor_notifications` (
  `notification_id` int(11) NOT NULL AUTO_INCREMENT,
  `instructor_id` int(11) NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `quiz_id` int(11) DEFAULT NULL,
  `submission_id` int(11) DEFAULT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'submit',
  `title` varchar(150) NOT NULL,
  `message` varchar(255) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`notification_id`),
  UNIQUE KEY `unique_submission_notification` (`submission_id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `instructor_quiz_alignment_evaluations` (
  `evaluation_id` int(11) NOT NULL AUTO_INCREMENT,
  `quiz_id` int(11) NOT NULL,
  `instructor_id` int(11) NOT NULL,
  `alignment_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `content_relevance_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `evaluated_by` int(11) NOT NULL,
  `evaluated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `review_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`evaluation_id`),
  UNIQUE KEY `uq_quiz_alignment` (`quiz_id`),
  UNIQUE KEY `unique_quiz_alignment` (`quiz_id`),
  KEY `idx_alignment_instructor` (`instructor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS `instructor_quiz_rewards` (
  `reward_id` int(11) NOT NULL AUTO_INCREMENT,
  `quiz_id` int(11) NOT NULL,
  `instructor_id` int(11) NOT NULL,
  `reward_type` varchar(50) NOT NULL,
  `exp_awarded` int(11) NOT NULL DEFAULT 0,
  `pass_rate` decimal(5,2) NOT NULL DEFAULT 0.00,
  `valid_submissions` int(11) NOT NULL DEFAULT 0,
  `passed_submissions` int(11) NOT NULL DEFAULT 0,
  `awarded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`reward_id`),
  UNIQUE KEY `uq_quiz_reward_type` (`quiz_id`,`reward_type`),
  KEY `idx_instructor_reward` (`instructor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=176 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `instructor_syllabi` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `instructor_id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `file_data` mediumblob NOT NULL,
  `content` mediumtext NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `accepted_by` int(11) DEFAULT NULL,
  `accepted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `maintenance_state` (
  `id` tinyint(4) NOT NULL,
  `enabled` tinyint(4) NOT NULL DEFAULT 0,
  `generation` int(11) NOT NULL DEFAULT 0,
  `deadline` bigint(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `quiz_idsubmissions` (
  `submission_id` int(11) NOT NULL AUTO_INCREMENT,
  `quiz_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `answers` longtext NOT NULL,
  `score` decimal(5,2) DEFAULT 0.00,
  `xp_earned` int(11) DEFAULT 0,
  `status` varchar(30) DEFAULT 'submitted',
  `submitted_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`submission_id`),
  KEY `quiz_id` (`quiz_id`),
  KEY `student_id` (`student_id`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `quiz_reviewer_settings` (
  `quiz_id` int(11) NOT NULL,
  `reviewer_enabled` tinyint(4) NOT NULL DEFAULT 0,
  `answers_released` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`quiz_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS `quiz_submission_snapshots` (
  `submission_id` int(11) NOT NULL,
  `snapshot_json` longtext NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`submission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS `quizzes` (
  `quiz_id` int(11) NOT NULL AUTO_INCREMENT,
  `instructor_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `section` varchar(100) NOT NULL,
  `mode` enum('formal','informal') NOT NULL DEFAULT 'formal',
  `quiz_type` varchar(100) NOT NULL,
  `due_date` date DEFAULT NULL,
  `time_limit` int(11) NOT NULL,
  `xp_reward` int(11) NOT NULL,
  `instructions` text DEFAULT NULL,
  `questions` longtext DEFAULT NULL,
  `status` enum('draft','active','removed') NOT NULL DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`quiz_id`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `student` (
  `student_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_number` int(11) DEFAULT NULL,
  `institutional_email` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `first_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `college` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `program` varchar(100) DEFAULT NULL,
  `year_level` int(11) DEFAULT NULL,
  `block` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'Active',
  PRIMARY KEY (`student_id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `student_powerup_grants` (
  `student_id` int(11) NOT NULL,
  `level` int(11) NOT NULL,
  `type` varchar(32) NOT NULL,
  `remaining` int(11) NOT NULL DEFAULT 0,
  `permanent` tinyint(4) NOT NULL DEFAULT 0,
  `bonus` int(11) NOT NULL DEFAULT 0,
  `granted_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`student_id`,`level`),
  UNIQUE KEY `student_id` (`student_id`,`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `student_powerup_uses` (
  `use_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `quiz_id` int(11) NOT NULL,
  `question_index` int(11) NOT NULL,
  `type` varchar(32) NOT NULL,
  `xp_cost` int(11) NOT NULL DEFAULT 0,
  `payload` longtext NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`use_id`),
  UNIQUE KEY `student_id` (`student_id`,`quiz_id`,`question_index`,`type`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `student_quiz_attempts` (
  `student_id` int(11) NOT NULL,
  `quiz_id` int(11) NOT NULL,
  `answers` longtext NOT NULL,
  `started_at` timestamp NULL DEFAULT current_timestamp(),
  `open_count` int(11) NOT NULL DEFAULT 0,
  `deadline` bigint(20) DEFAULT NULL,
  `session_token` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`student_id`,`quiz_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `student_quiz_notification_reads` (
  `notification_read_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `quiz_id` int(11) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 1,
  `read_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`notification_read_id`),
  UNIQUE KEY `unique_student_quiz` (`student_id`,`quiz_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `student_reward_progress` (
  `student_id` int(11) NOT NULL,
  `lifetime_xp` int(11) NOT NULL DEFAULT 0,
  `streak` int(11) NOT NULL DEFAULT 0,
  `last_activity` date DEFAULT NULL,
  PRIMARY KEY (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `student_system_notifications` (
  `notification_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `quiz_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(4) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`notification_id`),
  KEY `student_feed` (`student_id`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS `student_xp_awards` (
  `submission_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `base_xp` int(11) NOT NULL,
  `multiplier` decimal(3,1) NOT NULL DEFAULT 1.0,
  `crown_bonus` int(11) NOT NULL DEFAULT 0,
  `final_xp` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`submission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `studybuddy_chats` (
  `chat_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL DEFAULT 'New conversation',
  `subject` varchar(255) NOT NULL DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`chat_id`),
  KEY `student_history` (`student_id`,`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `studybuddy_messages` (
  `message_id` int(11) NOT NULL AUTO_INCREMENT,
  `chat_id` int(11) NOT NULL,
  `role` enum('user','assistant') NOT NULL,
  `content` text NOT NULL,
  `request_id` varchar(64) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`message_id`),
  UNIQUE KEY `request_role` (`chat_id`,`request_id`,`role`),
  CONSTRAINT `studybuddy_chat_messages` FOREIGN KEY (`chat_id`) REFERENCES `studybuddy_chats` (`chat_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `syllabus_alerts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `syllabus_review_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `review_id` int(11) NOT NULL,
  `actor_role` varchar(20) NOT NULL,
  `actor_id` int(11) NOT NULL,
  `action` varchar(30) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `review_id` (`review_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `syllabus_reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quiz_id` int(11) NOT NULL,
  `syllabus_id` int(11) NOT NULL,
  `fingerprint` char(64) NOT NULL,
  `report` mediumtext DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `questions_snapshot` longtext DEFAULT NULL,
  `rubric_version` int(11) NOT NULL DEFAULT 0,
  `attempts` int(11) NOT NULL DEFAULT 0,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `revision` (`quiz_id`,`syllabus_id`,`fingerprint`)
) ENGINE=InnoDB AUTO_INCREMENT=892 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` tinyint(1) NOT NULL DEFAULT 1,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `teaching_assignments` (
  `assignment_id` int(11) NOT NULL AUTO_INCREMENT,
  `instructor_id` int(11) NOT NULL,
  `subject_name` varchar(100) NOT NULL,
  `section` varchar(50) NOT NULL,
  `assignment_type` varchar(50) NOT NULL,
  PRIMARY KEY (`assignment_id`),
  KEY `instructor_id` (`instructor_id`),
  CONSTRAINT `teaching_assignments_ibfk_1` FOREIGN KEY (`instructor_id`) REFERENCES `instructor` (`instructor_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
INSERT IGNORE INTO maintenance_state(id,enabled,generation,deadline) VALUES(1,0,0,0);
SET FOREIGN_KEY_CHECKS=1;

-- Source: 20261112_final_opening_alerts.sql
ALTER TABLE instructor_notifications MODIFY submission_id INT NULL;

-- Source: 20261112_powerups.sql
CREATE TABLE IF NOT EXISTS student_powerup_grants (
 student_id INT NOT NULL, level INT NOT NULL, type VARCHAR(32) NOT NULL,
 remaining INT NOT NULL DEFAULT 0, permanent TINYINT NOT NULL DEFAULT 0,
 bonus INT NOT NULL DEFAULT 0, granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(student_id, level), UNIQUE KEY(student_id, type)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS student_powerup_uses (
 use_id INT AUTO_INCREMENT PRIMARY KEY, student_id INT NOT NULL, quiz_id INT NOT NULL,
 question_index INT NOT NULL, type VARCHAR(32) NOT NULL, xp_cost INT NOT NULL DEFAULT 0,
 payload LONGTEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY(student_id, quiz_id, question_index, type)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS student_quiz_attempts (
 student_id INT NOT NULL, quiz_id INT NOT NULL, answers LONGTEXT NOT NULL,
 started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(student_id, quiz_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS student_xp_awards (
 submission_id INT PRIMARY KEY, student_id INT NOT NULL, base_xp INT NOT NULL,
 multiplier DECIMAL(3,1) NOT NULL DEFAULT 1, crown_bonus INT NOT NULL DEFAULT 0,
 final_xp INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS student_reward_progress (
 student_id INT PRIMARY KEY, lifetime_xp INT NOT NULL DEFAULT 0,
 streak INT NOT NULL DEFAULT 0, last_activity DATE DEFAULT NULL
) ENGINE=InnoDB;
-- Existing results retain their XP and do not consume newly unlocked power-ups.
INSERT IGNORE INTO student_xp_awards (submission_id,student_id,base_xp,final_xp)
SELECT submission_id,student_id,xp_earned,xp_earned FROM quiz_idsubmissions
WHERE status IN ('submitted','graded');

-- Source: 20261112_quiz_sessions.sql
ALTER TABLE student_quiz_attempts ADD COLUMN IF NOT EXISTS open_count INT NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS deadline BIGINT NULL, ADD COLUMN IF NOT EXISTS session_token VARCHAR(64) NULL;
CREATE TABLE IF NOT EXISTS student_system_notifications (
 notification_id INT AUTO_INCREMENT PRIMARY KEY, student_id INT NOT NULL, quiz_id INT NOT NULL,
 title VARCHAR(255) NOT NULL, message TEXT NOT NULL, is_read TINYINT NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, KEY student_feed(student_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Source: 20261112_studybuddy_history.sql
CREATE TABLE IF NOT EXISTS studybuddy_chats (
 chat_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 student_id INT NOT NULL,
 title VARCHAR(100) NOT NULL DEFAULT 'New conversation',
 subject VARCHAR(255) NOT NULL DEFAULT '',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY student_history (student_id,updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS studybuddy_messages (
 message_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 chat_id INT NOT NULL,
 role ENUM('user','assistant') NOT NULL,
 content TEXT NOT NULL,
 request_id VARCHAR(64) NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY request_role (chat_id,request_id,role),
 CONSTRAINT studybuddy_chat_messages FOREIGN KEY (chat_id) REFERENCES studybuddy_chats(chat_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Source: 20261113_review_history.sql
CREATE TABLE IF NOT EXISTS ai_review_sets (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 scope VARCHAR(190) NOT NULL, owner_id INT NOT NULL, role VARCHAR(16) NOT NULL,
 feature VARCHAR(32) NOT NULL, quiz_id INT NOT NULL DEFAULT 0,
 fingerprint CHAR(64) NOT NULL, source_hash CHAR(64) NOT NULL, context_json LONGTEXT NOT NULL, state_json LONGTEXT NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY context_key(scope,fingerprint), KEY owner_key(role,owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS ai_review_versions (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, set_id BIGINT UNSIGNED NOT NULL,
 version INT NOT NULL, response_json LONGTEXT NOT NULL, hidden TINYINT NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY version_key(set_id,version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS quiz_reviewer_settings (
 quiz_id INT PRIMARY KEY, reviewer_enabled TINYINT NOT NULL DEFAULT 0,
 answers_released TINYINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS quiz_submission_snapshots (
 submission_id INT PRIMARY KEY, snapshot_json LONGTEXT NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Source: 20261114_admin_quiz_removal.sql
ALTER TABLE quizzes MODIFY status ENUM('draft','active','removed') NOT NULL DEFAULT 'draft';

-- Source: 20261114_maintenance_countdown.sql
CREATE TABLE IF NOT EXISTS maintenance_state (id TINYINT PRIMARY KEY, enabled TINYINT NOT NULL DEFAULT 0, generation INT NOT NULL DEFAULT 0, deadline BIGINT NOT NULL DEFAULT 0);
INSERT IGNORE INTO maintenance_state(id,enabled,generation,deadline) SELECT 1,COALESCE(MAX(setting_value),0),0,0 FROM system_settings WHERE setting_key='platform_maintenance_mode_enabled';

-- Source: 20261114_syllabus.sql
CREATE TABLE IF NOT EXISTS instructor_syllabi(id INT AUTO_INCREMENT PRIMARY KEY,instructor_id INT NOT NULL,subject VARCHAR(255) NOT NULL,filename VARCHAR(255) NOT NULL,file_data MEDIUMBLOB NOT NULL,content MEDIUMTEXT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS syllabus_reviews(id INT AUTO_INCREMENT PRIMARY KEY,quiz_id INT NOT NULL,syllabus_id INT NOT NULL,fingerprint CHAR(64) NOT NULL,report MEDIUMTEXT NULL,status VARCHAR(20) NOT NULL DEFAULT 'pending',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY revision(quiz_id,syllabus_id,fingerprint));
CREATE TABLE IF NOT EXISTS syllabus_alerts(id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(255) NOT NULL,message TEXT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Source: 20261115_alignment_workflow.sql
ALTER TABLE instructor_syllabi ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending', ADD COLUMN IF NOT EXISTS accepted_by INT NULL, ADD COLUMN IF NOT EXISTS accepted_at DATETIME NULL;
ALTER TABLE syllabus_reviews ADD COLUMN IF NOT EXISTS questions_snapshot LONGTEXT NULL, ADD COLUMN IF NOT EXISTS rubric_version INT NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL;
ALTER TABLE instructor_quiz_alignment_evaluations ADD COLUMN IF NOT EXISTS review_id INT NULL;
ALTER TABLE instructor_notifications MODIFY student_id INT NULL, MODIFY quiz_id INT NULL;
CREATE TABLE IF NOT EXISTS syllabus_review_events(id INT AUTO_INCREMENT PRIMARY KEY,review_id INT NOT NULL,actor_role VARCHAR(20) NOT NULL,actor_id INT NOT NULL,action VARCHAR(30) NOT NULL,message TEXT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX(review_id));
INSERT INTO syllabus_review_events(review_id,actor_role,actor_id,action,message) SELECT r.id,'system',0,'legacy_snapshot',COALESCE(r.report,'No legacy report') FROM syllabus_reviews r WHERE r.rubric_version=0 AND NOT EXISTS(SELECT 1 FROM syllabus_review_events e WHERE e.review_id=r.id AND e.action='legacy_snapshot');

-- Source: 20261115_project_integrity.sql
ALTER TABLE student_quiz_attempts ADD COLUMN IF NOT EXISTS snapshot_json LONGTEXT NULL;
CREATE TABLE IF NOT EXISTS ai_usage_limits(owner_key VARCHAR(100) NOT NULL,usage_day DATE NOT NULL,requests INT NOT NULL DEFAULT 0,PRIMARY KEY(owner_key,usage_day));
CREATE TABLE IF NOT EXISTS login_rate_limits(bucket CHAR(64) PRIMARY KEY,window_start BIGINT NOT NULL,attempts INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS ai_pending_requests(owner_key VARCHAR(100) NOT NULL,request_key VARCHAR(100) NOT NULL,expires_at BIGINT NOT NULL,PRIMARY KEY(owner_key,request_key));

-- Record the complete schema version so tools/migrate.php does not replay these migrations.
CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
INSERT IGNORE INTO schema_migrations (name) VALUES ('00000000_baseline.sql'), ('20261112_final_opening_alerts.sql'), ('20261112_powerups.sql'), ('20261112_quiz_sessions.sql'), ('20261112_studybuddy_history.sql'), ('20261113_review_history.sql'), ('20261114_admin_quiz_removal.sql'), ('20261114_maintenance_countdown.sql'), ('20261114_syllabus.sql'), ('20261115_alignment_workflow.sql'), ('20261115_project_integrity.sql');